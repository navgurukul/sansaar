const marked = require('marked');
const fs = require('fs-extra');
const axios = require('axios');
const AWS = require('aws-sdk');
const _ = require('lodash');
const path = require('path');
const CONFIG = require('../config/index');

const s3 = new AWS.S3({
  secretAccessKey: CONFIG.auth.aws.s3SecretAccessKey,
  accessKeyId: CONFIG.auth.aws.s3SecretKeyId,
  region: CONFIG.auth.aws.s3Region,
});

class CoursesSeeder {
  constructor(addUpdateSingleCourse, courseName) {
    this.courseDir = path.resolve('curriculum');
    this.allCourseFolder = [];
    this.courseDetails = [];
    this.exercises = [];
    // eslint-disable-next-line
    this.regex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    this.addUpdateSingleCourse = addUpdateSingleCourse;
    this.courseName = courseName;
  }

  async init() {
    if (this.addUpdateSingleCourse) {
      // addUpdate single course
      await this.parseCourseDir(this.courseName);
    } else {
      // get all courses file from cu
      await this.getAllCourseFile();
      // get all course details and exercise details.
      const promises = [];
      _.map(this.allCourseFolder, (folder) => {
        promises.push(this.parseCourseDir(folder));
      });
      await Promise.all(promises);
    }

    // add new course
    await this.addCourse();

    // add or update exercise
    await this.addUpdateExercise();
    return true;
  }

  async getAllCourseFile() {
    const dir = await fs.promises.opendir(this.courseDir);
    // eslint-disable-next-line
    for await (const dirent of dir) {
      if (!dirent.name.match(/.md/g)) {
        this.allCourseFolder.push(dirent.name);
      }
    }
  }

  async parseCourseDir(folder) {
    // eslint-disable-next-line
    const path = `${this.courseDir}/${folder}/index.md`;
    const assetsPath = `${this.courseDir}/${folder}/images`;
    if (fs.existsSync(path)) {
      this.parseAndUploadImage(assetsPath);
      const course = {};
      const courseDetails = await this.parseCourseDetails(path.replace('index.md', 'info.md'));
      if (courseDetails) {
        this.courseDetails.push(courseDetails);
        course.courseDetails = courseDetails;
        const data = fs.readFileSync(path);
        const tokens = marked.lexer(data.toString());
        const { items } = tokens[0];
        const exerciseFile = [];
        _.map(items, (item) => {
          const exerciseFiles = item.tokens;
          _.map(exerciseFiles, (file, index) => {
            const allExerciseFile = {};
            if (file.type === 'text') {
              if (file.text.match(/.md/g)) {
                allExerciseFile.fileName = file.text;
                allExerciseFile.childExercise = [];

                exerciseFile.push(allExerciseFile);
              }
            } else if (file.type === 'list') {
              allExerciseFile.fileName = exerciseFiles[index - 1].text;
              allExerciseFile.childExercise = [];
              _.map(file.items, (childExerciseFile) => {
                allExerciseFile.childExercise.push(childExerciseFile.text);
              });
              exerciseFile.push(allExerciseFile);
            }
          });
        });
        const promises = [];
        const courseId = courseDetails ? courseDetails.id : null;
        _.map(exerciseFile, (file) => {
          promises.push(this.parseExerciseDetails(file, folder, courseId));
        });
        const exerciseDetails = await Promise.all(promises);
        course.exerciseDetails = exerciseDetails;
        this.exercises.push(course);
      }
    } else {
      return "Pathway doesn't exist";
    }
    return true;
  }

  /* eslint-disable */
  async parseCourseDetails(path) {
    if (fs.existsSync(path)) {
      const data = fs.readFileSync(path);
      const tokens = marked.lexer(data.toString());
      const courseDetails = {};
      const items = tokens[0].text.split('\n');
      _.map(items, (item) => {
        const split = item.split(': ');
        if (split[1]) {
          courseDetails[split[0]] = split[1];
        } else {
          const logo = split[0].split(':');
          courseDetails[logo[0]] = `${logo[1]}:${logo[2]}`;
        }
      });
      const courseId = await this.getCourseId(courseDetails.name);
      courseDetails.id = courseId;
      if (!courseDetails.logo) {
        courseDetails.logo = 'http://navgurukul.org/img/sqlogo.jpg';
      }
      return courseDetails;
    }
    return null;
  }
  /* eslint-enable */

  async parseExerciseDetails(file, folder, courseId) {
    const basePath = `${this.courseDir}/${folder}/${file.fileName}`;
    let assetsPath;
    // Check if nested folders have assets folder
    if (fs.statSync(basePath).isDirectory()) {
      assetsPath = `${basePath}/assets`;
      // This is because of un-uniformity of folder's name
      if (!fs.existsSync(assetsPath)) {
        assetsPath = `${this.courseDir}/${folder}/images`;
      }
    } else {
      assetsPath = `${this.courseDir}/${folder}/images`;
    }
    this.parseAndUploadImage(assetsPath);

    const exercise = {};
    const promises = [];
    // eslint-disable-next-line
    let path;
    if (file.childExercise.length) {
      _.map(file.childExercise, (childExerciseFile) => {
        path = `${basePath}/${childExerciseFile}`;
        promises.push(this.parseChildExercise(path, courseId, childExerciseFile));
      });
    } else {
      path = basePath.replace(/\s/g, '');
      if (fs.existsSync(path)) {
        const data = fs.readFileSync(path);
        const tokens = marked.lexer(data.toString());
        _.map(tokens, (exer) => {
          if (exer.lang === 'ngMeta') {
            exercise.name = exer.text.replace('name: ', '').replace('\nsubmission_type: url', '');
          }
        });
        const name = file.fileName.replace('.md', '');
        const content = await this.parseMarkdownContent(tokens, assetsPath);

        exercise.name = exercise.name ? exercise.name : name;
        exercise.course_id = courseId;
        exercise.content = content;
        exercise.slug = path
          .split(`${this.courseDir}/`)
          .slice(-1)[0]
          .replace('/', '__')
          .replace('.md', '');
        exercise.github_link = `https://github.com/navgurukul/newton/tree/master/${
          path.split(`${this.courseDir}/`).slice(-1)[0]
        }`;
        if (exercise.name.length < 100) {
          return exercise;
        }
        return null;
      }
    }
    const allChildExercise = await Promise.all(promises);
    const childExercise = allChildExercise.filter((x) => x);
    return { childExercise };
  }

  // eslint-disable-next-line
  async parseChildExercise(path, courseId, childExerciseFile) {
    const exercise = {};
    const childExercisePath = path.replace(/\s/g, '');
    if (fs.existsSync(childExercisePath)) {
      const data = fs.readFileSync(childExercisePath);
      const tokens = marked.lexer(data.toString());
      _.map(tokens, (exerciseContent) => {
        if (exerciseContent.lang === 'ngMeta') {
          exercise.name = exerciseContent.text
            .replace('name: ', '')
            .replace('\nsubmission_type: url', '');
        }
      });
      const name = childExerciseFile.replace('.md', '');
      const content = await this.parseMarkdownContent(tokens, childExercisePath);
      exercise.name = exercise.name ? exercise.name : name;
      exercise.course_id = courseId;
      exercise.content = content;
      exercise.slug = childExercisePath
        .split(`${this.courseDir}/`)
        .slice(-1)[0]
        .replace('/', '__')
        .replace('.md', '');
      exercise.github_link = `https://github.com/navgurukul/newton/tree/master/${
        childExercisePath.split(`${this.courseDir}/`).slice(-1)[0]
      }`;
      if (exercise.name.length <= 100) {
        return exercise;
      }
      return null;
    }
    return null;
  }

  async parseAndUploadImage(imageDir) {
    fs.readdir(imageDir, (err, filenames) => {
      if (!err) {
        _.forEach(filenames, (file) => {
          if (file.match(/\.(png|jpg|jpeg|gif)/)) {
            const fullPath = `${imageDir}/${file}`;
            const imageBuffer = fs.readFileSync(fullPath);
            this.s3Uploader(fullPath, imageBuffer);
          } else {
            const nestedPath = `${imageDir}/${file}`;
            fs.readdir(nestedPath, (error, nestedfilenames) => {
              if (!error) {
                _.forEach(nestedfilenames, (nestedFile) => {
                  const nestedFullPath = `${nestedPath}/${nestedFile}`;
                  const nestedImageBuffer = fs.readFileSync(nestedFullPath);
                  this.s3Uploader(nestedFullPath, nestedImageBuffer);
                });
              }
            });
          }
        });
      }
    });
  }

  async s3Uploader(filePath, imageData) {
    // eslint-disable-next-line
    this.cloudPath = filePath.split('curriculum/')[1];
    this.extn = filePath.split('.').pop();
    this.contentType = 'application/octet-stream';
    this.contentType = `image/${this.extn}`;
    const params = {
      Bucket: 'merakilearn',
      Key: `course_images/${this.cloudPath}`,
      Body: imageData,
      ContentType: this.contentType,
      ACL: 'public-read',
    };
    s3.upload(params, (err, data) => {
      if (err) {
        throw err;
      }
      // eslint-disable-next-line
      console.log(data);
      return {
        //   relativePath: imagePath,
        awsLink: `https://merakilearn.s3.ap-south-1.amazonaws.com/course_images${this.cloudPath}`,
        //   imageMD: imageText,
      };
    });
  }

  async parseMarkdownContent(tokens, imagePath = '') {
    // eslint-disable-next-line
    let partPath = imagePath.split('curriculum/')[1];
    partPath = partPath.split('/').slice(0, -1).join('/');
    // console.log(partPath);
    let exercise = [];
    let markDownContent = '';
    _.map(tokens, (token) => {
      if (token.type === 'paragraph' && token.text.includes('![')) {
        token.raw = '';
        token.text = '';

        _.map(token.tokens, (innnerToken) => {
          if (innnerToken.type === 'image') {
            const awsPath = `https://merakilearn.s3.ap-south-1.amazonaws.com/course_images/${partPath}/${innnerToken.href}`;
            exercise.push({ type: 'markdown', value: markDownContent });
            markDownContent = '';
            exercise.push({ type: 'image', value: { url: awsPath } });
          }
        });
      }
      if (token.type === 'code' && token.lang === 'python') {
        exercise.push({ type: 'markdown', value: markDownContent });
        markDownContent = '';
        exercise.push({ type: token.lang, value: { code: token.text, testCases: [] } });
      }

      if (token.type === 'paragraph') {
        if (token.text.includes('@[youtube]')) {
          exercise.push({ type: 'markdown', value: markDownContent });
          markDownContent = '';
          if (token.tokens[1].href.includes('https://')) {
            exercise.push({
              type: 'youtube',
              value: token.tokens[1].href.match(this.regex)[1],
            });
          } else {
            exercise.push({ type: 'youtube', value: token.tokens[1].href });
          }
        } else {
          markDownContent += `${token.raw} `;
        }
      }

      if (token.type === 'list') {
        markDownContent += `${token.raw} `;
      }

      if (token.type === 'heading') {
        markDownContent += `${token.raw} `;
      }
      /* eslint-disable */
      if (token.lang === 'faq') {
        exercise.push({ type: 'markdown', value: markDownContent });
        markDownContent = '';
        const value = {};
        const options = [];
        const contents = token.text.split('\n');
        _.map(contents, (content) => {
          if (content.includes('- ')) {
            options.push(content.replace('- ', ''));
          }
        });
        value.question = contents[0];
        value.options = options;
        value.answerKey = contents.slice(-2, -1)[0].replace('> ', '');
        value.Eexplanation = contents.slice(-1)[0].replace('>> ', '');
        exercise.push({ type: 'faq', value });
      }
    });
    /* eslint-enable */

    if (markDownContent) {
      // console.log(markDownContent);
      exercise.push({ type: 'markdown', value: markDownContent });
    }
    const formatedExercise = exercise.filter((x) => x.value);
    exercise = formatedExercise;
    return JSON.stringify(exercise);
  }

  async addCourse() {
    const promises = [];
    _.map(this.courseDetails, (course) => {
      if (course) {
        if (!course.id) {
          delete course.id;
          promises.push(
            axios.post(
              `http://localhost:${CONFIG.seeder.seedPort}/courses-QH2hh8Ntynz5fyTv`,
              course
            )
          );
        }
      }
    });
    const insertedCourses = await Promise.all(promises);

    // once new courses is added then add course_id with respective exercise
    _.map(insertedCourses, (insertedCourse) => {
      const { newCourse } = insertedCourse.data;
      _.map(this.exercises, (course, index) => {
        if (course) {
          if (course.courseDetails.name === newCourse.name) {
            this.exercises[index].courseDetails.id = newCourse.id;
            _.map(this.exercises[index].exerciseDetails, (child, i) => {
              if (child.childExercise) {
                const updateChildExCourseId = this.exercises[index].exerciseDetails[
                  i
                ].childExercise.filter((childExer) => (childExer.course_id = newCourse.id));
                this.exercises[index].exerciseDetails[i].childExercise = updateChildExCourseId;
              }
            });
            const updatedExerciseDetails = this.exercises[index].exerciseDetails.filter((x) =>
              x.course_id ? (x.course_id = newCourse.id) : x
            );
            this.exercises[index].exerciseDetails = updatedExerciseDetails;
          }
        }
      });
    });
    return true;
  }

  /* eslint-disable */
  async addUpdateExercise() {
    const promises = [];
    _.map(this.exercises, (exercises) => {
      _.map(exercises.exerciseDetails, (exercise) => {
        if (!exercise.childExercise && exercise.course_id) {
          promises.push(
            axios.post(`http://localhost:${CONFIG.seeder.seedPort}/exercises`, { exercise })
          );
        } else if (exercise.childExercise) {
          const childExercise = exercise.childExercise.filter((x) => x);
          promises.push(
            axios.post(`http://localhost:${CONFIG.seeder.seedPort}/exercises`, { childExercise })
          );
        }
      });
    });
    await Promise.all(promises);
    return true;
  }

  async getCourseId(name) {
    const res = await axios.get(`http://localhost:${CONFIG.seeder.seedPort}/courses/name`, {
      params: { name },
    });
    const id = res.data.course.length ? res.data.course[0].id : null;
    return id;
  }

  static showErrorAndExit(message) {
    console.log(message);
    console.log('Fix the above error and re-run this script.');
    process.exit();
  }
  /* eslint-enable */

  static addUpdateSingleCourseFlag() {
    if (process.argv.indexOf('--addUpdateSingleCourse') > -1) {
      return true;
    }
    return false;
  }

  static getCourseName() {
    if (process.argv.indexOf('--addUpdateSingleCourse') > -1) {
      const courseName = process.argv[process.argv.indexOf('--addUpdateSingleCourse') + 1];
      if (!courseName) {
        this.showErrorAndExit('--addUpdateSingleCourse course name needs to be specified.');
      }
      try {
        fs.statSync(path.resolve(`curriculum/${courseName}`)); // stat
        return courseName;
      } catch (e) {
        this.showErrorAndExit(
          `The specified courseName ${courseName} is doesn't exist in curriculum.`
        );
      }
    }
    return false;
  }
}

if (!module.parent) {
  const addUpdateSingleCourse = CoursesSeeder.addUpdateSingleCourseFlag();
  const courseName = CoursesSeeder.getCourseName();
  const seeder = new CoursesSeeder(addUpdateSingleCourse, courseName);
  seeder.init().then((res) => {
    /* eslint-disable */
    if (res) {
      console.log('Successfully seeded courses and exercises');
    } else {
      console.log(`${res}`);
    }
    /* eslint-enable */
  });
}
