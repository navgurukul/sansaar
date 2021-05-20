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

        const content = await this.parseMarkdownContent(path, tokens);

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
      const content = await this.parseMarkdownContent(path, tokens);

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

  async getExerciseName() {}

  async parseMarkdownContent(filePath, tokens) {
    const exerciseName = filePath.split('/').pop().split('.')[0];
    let keyNumber = 0;
    let keyProp;
    let modifiedContent = '';
    let keyPropMapping = '';

    let partPath = filePath.split('curriculum/')[1];
    const exrRelPath = partPath.split('/').slice(1).join('/');

    partPath = partPath.split('/').slice(0, -1).join('/');
    console.log(exrRelPath);
    this.createDirs(exrRelPath);
    let exercise = [];
    let markDownContent = '';
    _.map(tokens, (token) => {
      console.log(token);
      // console.log(token);
      // if (token.type === 'paragraph' && token.text.includes('![')) {
      //   token.raw = '';
      //   token.text = '';

      //   _.map(token.tokens, (innnerToken) => {
      //     if (innnerToken.type === 'image') {
      //       const awsPath = `https://${CONFIG.auth.aws.s3Bucket}.s3.ap-south-1.amazonaws.com/course_images/${partPath}/${innnerToken.href}`;
      //       exercise.push({ type: 'markdown', value: markDownContent });
      //       markDownContent = '';
      //       exercise.push({ type: 'image', value: { url: awsPath } });
      //     }
      //   });
      // }

      if (token.type === 'code' && token.lang === 'ngMeta') {
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent =
          modifiedContent + '```' + token.lang + '\n' + keyProp + '\n' + '```' + '\n';
        keyPropMapping = `${keyProp}=${token.text.trim()}\n`;
        // console.log(modifiedContent);
      }

      if (token.type === 'space') {
        modifiedContent = modifiedContent + token.raw.substr(1); // Always omit first \n ;
      }

      if (token.type === 'heading') {
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent = modifiedContent + `${token.raw.trim().split(' ')[0]} ${keyProp}\n\n`;
        keyPropMapping = keyPropMapping + `${keyProp}=${token.text.trim()}\n`;
      }
      // hr
      if (token.type === 'hr') {
        modifiedContent = modifiedContent + token.raw; // Always omit first \n ;
      }
      // table has innerTokens but has more than one tokens due to which it is parsed more than once
      if (token.type === 'table') {
        let tableHeaderContent = '|';
        let tableDivider = '|';

        _.map(token.header, (tableHeader) => {
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          tableHeaderContent = tableHeaderContent + `${keyProp}|`;
          tableDivider = tableDivider + '---|';
          keyPropMapping = keyPropMapping + `${keyProp}=${tableHeader}\n`;
        });
        modifiedContent = modifiedContent + tableHeaderContent + '\n';
        modifiedContent = modifiedContent + tableDivider + '\n';

        _.map(token.cells, (cellRow) => {
          let tableCellContent = '|';
          _.map(cellRow, (cellValue) => {
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            tableCellContent = tableCellContent + `${keyProp}|`;
            keyPropMapping = keyPropMapping + `${keyProp}=${cellValue}\n`;
          });
          modifiedContent = modifiedContent + tableCellContent + '\n';
        });
      }

      if (token.type === 'space') {
        modifiedContent = modifiedContent + token.raw.substr(1); // Always omit first \n ;
      }
      // hr
      if (token.type === 'hr') {
        modifiedContent = modifiedContent + token.raw; // Always omit first \n ;
      }

      // table has innerTokens but has more than one tokens due to which it is parsed more than once
      // if (tokens.type !== 'table' && tokens.tokens) {
      //   _.map(tokens.tokens, (innerToken) => {
      //     // space
      //     if (innerToken.type === 'text' && innerToken.text === '\n') {
      //       console.log(innerToken);
      //       modifiedContent = modifiedContent + innerToken.text;
      //     }

      //     // paragraph - link
      //     else if (innerToken.type === 'link') {
      //       keyNumber += 1;
      //       keyProp = `${exerciseName}_key${keyNumber}`;
      //       modifiedContent = modifiedContent + `[${keyProp}](${innerToken.href})\n`;
      //       keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text.trim()}\n`;
      //     }

      //     // headings (headings has inner tokens so it never goes to the else part)
      //     else if (tokens.type === 'heading') {
      //       keyNumber += 1;
      //       keyProp = `${exerciseName}_key${keyNumber}`;
      //       modifiedContent = modifiedContent + `${tokens.raw.trim().split(' ')[0]} ${keyProp}\n\n`;
      //       keyPropMapping = keyPropMapping + `${keyProp}=${tokens.text.trim()}\n`;
      //     }
      //     // blockquotes
      //     else if (tokens.type === 'blockquote') {
      //       keyNumber += 1;
      //       keyProp = `${exerciseName}_key${keyNumber}`;
      //       modifiedContent = modifiedContent + `${tokens.raw.split(' ')[0]} ${keyProp}\n`;
      //       keyPropMapping = keyPropMapping + `${keyProp}=${tokens.text}\n`;
      //     }

      //     // normal text
      //     else if (innerToken.type === 'text' && innerToken.text !== '\n') {
      //       keyNumber += 1;
      //       keyProp = `${exerciseName}_key${keyNumber}`;
      //       modifiedContent = modifiedContent + `${keyProp}\n`;
      //       keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text.trim()}\n`;
      //     } else {
      //       modifiedContent = modifiedContent + innerToken.raw.trim();
      //     }
      //   });
      // } else {
      //   // list
      //   if (token.type === 'list') {
      //     _.map(token.items, (listItems) => {
      //       keyNumber += 1;
      //       keyProp = `${exerciseName}_key${keyNumber}`;

      //       // if list items are MD links
      //       if (listItems.text.match(/(\[.+\])(\((http).+\))/g)) {
      //         const linkText = listItems.text.substr(
      //           listItems.text.indexOf('[') + 1,
      //           listItems.text.indexOf(']') - 1
      //         );
      //         const hrefLink = listItems.text.substr(
      //           listItems.text.indexOf('('),
      //           listItems.text.indexOf(')')
      //         );
      //         modifiedContent =
      //           modifiedContent + `${listItems.raw.substr(0, 1)} [${keyProp}]${hrefLink}\n`;
      //         keyPropMapping = keyPropMapping + `${keyProp}=${linkText}\n`;
      //       } else {
      //         modifiedContent =
      //           modifiedContent + `${listItems.raw.trim().split(' ')[0]} ${keyProp}\n`;
      //         keyPropMapping = keyPropMapping + `${keyProp}=${listItems.text}\n`;
      //       }
      //     });
      //   } else if (token.type === 'table') {
      //     let tableHeaderContent = '|';
      //     let tableDivider = '|';

      //     _.map(token.header, (tableHeader) => {
      //       keyNumber += 1;
      //       keyProp = `${exerciseName}_key${keyNumber}`;
      //       tableHeaderContent = tableHeaderContent + `${keyProp}|`;
      //       tableDivider = tableDivider + '---|';
      //       keyPropMapping = keyPropMapping + `${keyProp}=${tableHeader}\n`;
      //     });
      //     modifiedContent = modifiedContent + tableHeaderContent + '\n';
      //     modifiedContent = modifiedContent + tableDivider + '\n';

      //     _.map(token.cells, (cellRow) => {
      //       let tableCellContent = '|';
      //       _.map(cellRow, (cellValue) => {
      //         keyNumber += 1;
      //         keyProp = `${exerciseName}_key${keyNumber}`;
      //         tableCellContent = tableCellContent + `${keyProp}|`;
      //         keyPropMapping = keyPropMapping + `${keyProp}=${cellValue}\n`;
      //       });
      //       modifiedContent = modifiedContent + tableCellContent + '\n';
      //     });
      //   } else {
      //     modifiedContent = modifiedContent + token.raw;
      //   }
      // }
    });

    exercise.push({ type: 'markdown', value: modifiedContent });
    // console.log(exercise);

    await this.writeFiles({
      exrRelPath,
      exerciseName,
      modifiedContent,
      keyPropMapping,
    });

    /* eslint-enable */

    if (markDownContent) {
      exercise.push({ type: 'markdown', value: markDownContent });
    }
    const formatedExercise = exercise.filter((x) => x.value);
    exercise = formatedExercise;
    return JSON.stringify(exercise);
  }

  async createDirs(relPath) {
    let createPath = '';
    if (relPath.indexOf('/') > -1) {
      createPath = relPath.split('/').slice(0, -1).join('/');
    }

    if (!fs.existsSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT`)) {
      fs.mkdirSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT`);
      fs.mkdirSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES`);
      fs.mkdirSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT/PROPERTIES_FILES`);
    }

    if (
      createPath &&
      !fs.existsSync(
        `${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES/${createPath}`
      )
    ) {
      console.log(
        `${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES/${createPath}`
      );
      fs.mkdirSync(
        `${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES/${createPath}`
      );
      fs.mkdirSync(
        `${this.courseDir}/${this.courseName}/PARSED_CONTENT/PROPERTIES_FILES/${createPath}`
      );
    }
  }

  async writeFiles({ exrRelPath, exerciseName, modifiedContent, keyPropMapping }) {
    if (exrRelPath.indexOf('/') > -1) {
      const subDir = exrRelPath.split('/')[0];
      fs.writeFileSync(
        path.resolve(
          `${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES/${subDir}/${this.courseName}_${exerciseName}.md`
        ),
        modifiedContent
      );

      fs.writeFileSync(
        path.resolve(
          `${this.courseDir}/${this.courseName}/PARSED_CONTENT/PROPERTIES_FILES/${subDir}/${this.courseName}_${exerciseName}_en.properties`
        ),
        keyPropMapping
      );
    } else {
      fs.writeFileSync(
        path.resolve(
          `${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES/${this.courseName}_${exerciseName}.md`
        ),
        modifiedContent
      );

      fs.writeFileSync(
        path.resolve(
          `${this.courseDir}/${this.courseName}/PARSED_CONTENT/PROPERTIES_FILES/${this.courseName}_${exerciseName}_en.properties`
        ),
        keyPropMapping
      );
    }
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
      // console.log(exercises);
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
