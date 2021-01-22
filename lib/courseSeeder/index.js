const marked = require('marked');
const fs = require('fs-extra');
const { statSync, readdirSync } = require('fs');
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
      await this.parseCourseDir(this.courseName, []);
    } else {
      const allCoursesDirName = await this.getAllCourseFile();
      const allCoursesInDB = await this.getAllCourses();

      const courseNamesFromDB = allCoursesInDB.map((course) => {
        return course.name;
      });
      const promises = [];
      _.map(allCoursesDirName, async (folder) => {
        promises.push(this.parseCourseDir(folder, courseNamesFromDB));
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
    return readdirSync(this.courseDir).filter((dirs) =>
      statSync(path.join(this.courseDir, dirs)).isDirectory()
    );
  }

  async parseCourseDir(folder, updateCourseNames) {
    // eslint-disable-next-line
    const path = `${this.courseDir}/${folder}/index.md`;
    const assetsPath = `${this.courseDir}/${folder}/images`;
    if (fs.existsSync(path)) {
      this.parseAndUploadImage(assetsPath);
      const course = {};
      const courseDetails = await this.parseCourseDetails(path.replace('index.md', 'info.md'));
      if (courseDetails) {
        if (updateCourseNames.length > 0 && updateCourseNames.indexOf(courseDetails.name) < 0) {
          // Exit if course folder does not already exist in database
          return false;
        }
        this.courseDetails.push(courseDetails);
        course.courseDetails = courseDetails;
        const data = fs.readFileSync(path);

        const tokens = marked.lexer(data.toString());
        const { items } = tokens[0];
        const exerciseFile = [];
        _.map(items, (item, outerIndex) => {
          const exerciseFiles = item.tokens;
          _.map(exerciseFiles, (file, index) => {
            const allExerciseFile = {};
            if (file.type === 'text') {
              if (file.text.match(/.md/g)) {
                allExerciseFile.fileName = file.text.trim();
                allExerciseFile.sequenceNum = outerIndex * 100;
                allExerciseFile.childExercises = [];
                exerciseFile.push(allExerciseFile);
              }
            } else if (file.type === 'list') {
              allExerciseFile.fileName = exerciseFiles[index - 1].text.trim();
              allExerciseFile.childExercises = [];

              _.map(file.items, (childExercisesFile, innerIndex) => {
                allExerciseFile.childExercises.push({
                  fileName: childExercisesFile.text,
                  sequenceNum: outerIndex * 100 + innerIndex,
                });
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
    const baseSequenceNum = file.sequenceNum;
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
    if (file.childExercises.length) {
      _.map(file.childExercises, (childExercisesFile) => {
        path = `${basePath}/${childExercisesFile.fileName}`;
        promises.push(this.parseChildExercise(path, courseId, childExercisesFile));
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
        exercise.sequence_num = baseSequenceNum;
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

    const childExercises = allChildExercise.filter((x) => x);
    return { childExercises };
  }

  // eslint-disable-next-line
  async parseChildExercise(path, courseId, childExercisesFile) {
    const exercise = {};
    const childExercisesPath = path.replace(/\s/g, '');
    if (fs.existsSync(childExercisesPath)) {
      const data = fs.readFileSync(childExercisesPath);
      const tokens = marked.lexer(data.toString());
      _.map(tokens, (exerciseContent) => {
        if (exerciseContent.lang === 'ngMeta') {
          exercise.name = exerciseContent.text
            .replace('name: ', '')
            .replace('\nsubmission_type: url', '');
        }
      });
      const name = childExercisesFile.fileName.replace('.md', '');
      const content = await this.parseMarkdownContent(tokens, childExercisesPath);

      exercise.name = exercise.name ? exercise.name : name;
      exercise.course_id = courseId;
      exercise.sequence_num = childExercisesFile.sequenceNum;
      exercise.content = content;
      exercise.slug = childExercisesPath
        .split(`${this.courseDir}/`)
        .slice(-1)[0]
        .replace('/', '__')
        .replace('.md', '');
      exercise.github_link = `https://github.com/navgurukul/newton/tree/master/${
        childExercisesPath.split(`${this.courseDir}/`).slice(-1)[0]
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
      Bucket: CONFIG.auth.aws.s3Bucket,
      Key: `course_images/${this.cloudPath}`,
      Body: imageData,
      ContentType: this.contentType,
      ACL: 'public-read',
    };
    // eslint-disable-next-line
    s3.upload(params, (err, data) => {
      if (err) {
        throw err;
      }
      // eslint-disable-next-line
      return {
        //   relativePath: imagePath,
        awsLink: `https://${CONFIG.auth.aws.s3Bucket}.s3.ap-south-1.amazonaws.com/course_images${this.cloudPath}`,
        //   imageMD: imageText,
      };
    });
  }

  async parseMarkdownContent(tokens, imagePath = '') {
    let partPath = imagePath.split('curriculum/')[1];
    partPath = partPath.split('/').slice(0, -1).join('/');
    let exercise = [];
    let markDownContent = '';
    _.map(tokens, (token) => {
      if (token.type === 'paragraph' && token.text.includes('![')) {
        token.raw = '';
        token.text = '';

        _.map(token.tokens, (innnerToken) => {
          if (innnerToken.type === 'image') {
            const awsPath = `https://${CONFIG.auth.aws.s3Bucket}.s3.ap-south-1.amazonaws.com/course_images/${partPath}/${innnerToken.href}`;
            exercise.push({ type: 'markdown', value: markDownContent });
            markDownContent = '';
            exercise.push({ type: 'image', value: { url: awsPath } });
          }
        });
      }

      if (token.type === 'table') {
        exercise.push({ type: 'markdown', value: markDownContent });
        markDownContent = '';
        exercise.push({
          type: token.type,
          value: { header: token.header, order: token.align, value: token.cells },
        });
      }

      if (token.type === 'code' && token.lang === 'python') {
        exercise.push({ type: 'markdown', value: markDownContent });
        markDownContent = '';
        exercise.push({ type: token.lang, value: { code: token.text, testCases: [] } });
      }

      if (token.type === 'code' && token.lang === 'bash') {
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
        if (token.type === 'heading' && token.depth > 1) {
          markDownContent += `\n\n`;
          markDownContent += `${token.raw} `;
        } else {
          markDownContent += `${token.raw} `;
        }
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

      if (token.type === 'typing') {
        exercise.push({ type: 'typing', value: markDownContent.split('') });
        markDownContent = '';
      }
    });
    /* eslint-enable */

    if (markDownContent) {
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
              if (child.childExercises) {
                const updateChildExCourseId = this.exercises[index].exerciseDetails[
                  i
                ].childExercises.filter((childExer) => (childExer.course_id = newCourse.id));
                this.exercises[index].exerciseDetails[i].childExercises = updateChildExCourseId;
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
    const slugArr = [];
    _.map(this.exercises, (exercises) => {
      _.map(exercises.exerciseDetails, async (exercise) => {
        if (exercise.childExercises) {
          const childExercise = exercise.childExercises.filter((childExer) => childExer);
          _.map(childExercise, async (childExer) => {
            if (!slugArr.includes(childExer.slug)) {
              slugArr.push(childExer.slug);
            }
          });
        } else {
          slugArr.push(exercise.slug);
        }
      });
    });
    _.map(this.exercises, (exercises) => {
      _.map(exercises.exerciseDetails, async (exercise, index) => {
        if (!exercise.childExercises && exercise.course_id) {
          promises.push(
            axios.post(`http://localhost:${CONFIG.seeder.seedPort}/exercises`, {
              exercise,
              slugArr,
            })
          );
        } else if (exercise.childExercises) {
          const childExercise = exercise.childExercises.filter((x) => x);
          promises.push(
            axios.post(`http://localhost:${CONFIG.seeder.seedPort}/exercises`, {
              childExercise,
              slugArr,
            })
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

  async getAllCourses() {
    const res = await axios.get(`http://localhost:${CONFIG.seeder.seedPort}/courses`);
    return res.data;
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
