const marked = require('marked');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

class CourseParser {
  constructor(singleCourse, courseName) {
    this.courseDir = path.resolve('curriculum');
    this.singleCourse = singleCourse;
    this.courseName = courseName;
  }

  async init() {
    if (this.singleCourse) {
      return this.parseCourseDir(this.courseName, []);
    }
  }

  async parseCourseDir(folder, updateCourseNames) {
    // eslint-disable-next-line
    const path = `${this.courseDir}/${folder}/index.md`;
    const assetsPath = `${this.courseDir}/${folder}/images`;
    if (fs.existsSync(path)) {
      //   this.parseAndUploadImage(assetsPath);
      const course = {};
      //   if (courseDetails) {
      //     if (updateCourseNames.length > 0 && updateCourseNames.indexOf(courseDetails.name) < 0) {
      //       // Exit if course folder does not already exist in database
      //       return false;
      //     }
      //     this.courseDetails.push(courseDetails);
      //     course.courseDetails = courseDetails;
      const data = fs.readFileSync(path);
      const tokens = marked.lexer(data.toString());
      const { items } = tokens[0];
      const exerciseFile = [];
      _.map(items, async (item, outerIndex) => {
        const exerciseFiles = item.tokens;
        _.map(exerciseFiles, async (file, index) => {
          const allExerciseFile = {};
          if (file.type === 'text') {
            if (file.text.match(/.md/g)) {
              allExerciseFile.fileName = file.text.trim();
              allExerciseFile.sequenceNum = outerIndex * 100;
              allExerciseFile.childExercises = [];
              await this.parseExerciseContent(
                `${this.courseDir}/${folder}/${allExerciseFile.fileName}`
              );
              exerciseFile.push(allExerciseFile);
            }
          } else if (file.type === 'list') {
            allExerciseFile.fileName = exerciseFiles[index - 1].text.trim();
            allExerciseFile.childExercises = [];
            _.map(file.items, async (childExercisesFile, innerIndex) => {
              allExerciseFile.childExercises.push({
                fileName: childExercisesFile.text,
                sequenceNum: outerIndex * 100 + innerIndex,
              });
              await this.parseExerciseContent(
                `${this.courseDir}/${folder}/${allExerciseFile.fileName}/${childExercisesFile.text}`
              );
            });
            exerciseFile.push(allExerciseFile);
          }
        });
      });
      return exerciseFile;

      //     const promises = [];
      //     const courseId = courseDetails ? courseDetails.id : null;
      //     _.map(exerciseFile, (file) => {
      //       promises.push(this.parseExerciseDetails(file, folder, courseId));
      //     });
      //     const exerciseDetails = await Promise.all(promises);
      //     course.exerciseDetails = exerciseDetails;
      //     this.exercises.push(course);
    } else {
      return "Path doesn't exist";
    }
  }

  async parseExerciseContent(filePath) {
    const exerciseName = filePath.split('/').pop().split('.')[0];
    // console.log(exerciseName);
    const mdContent = fs.readFileSync(filePath).toString();
    const parsedContent = marked.lexer(mdContent);
    let keyNumber = 0;
    let keyProp;

    let modifiedContent = '';
    let keyPropMapping = '';
    if (!fs.existsSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT`)) {
      fs.mkdirSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT`);
      fs.mkdirSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES`);
      fs.mkdirSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT/PROPERTIES_FILES`);
    }
    if (!fs.existsSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES`)) {
      fs.mkdirSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES`);
    }
    if (!fs.existsSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT/PROPERTIES_FILES`)) {
      fs.mkdirSync(`${this.courseDir}/${this.courseName}/PARSED_CONTENT/PROPERTIES_FILES`);
    }

    _.map(parsedContent, (tokens) => {
      if (tokens.tokens) {
        _.map(tokens.tokens, (innerToken) => {
          // space
          if (innerToken.type === 'text' && innerToken.text === '\n') {
            modifiedContent = modifiedContent + innerToken.text;
          }
          // normal text
          else if (innerToken.type === 'text' && innerToken.text !== '\n') {
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent = modifiedContent + `${keyProp}\n`;
            keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text}\n`;
          } else {
            modifiedContent = modifiedContent + innerToken.raw;
          }

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
        });
      } else {
        // code
        if (tokens.type === 'code' && tokens.lang === 'ngMeta') {
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          modifiedContent =
            modifiedContent + '```' + tokens.lang + '\n' + keyProp + '\n' + '```' + '\n';
          keyPropMapping = `${keyProp}=${tokens.text}\n`;
        }

        // list
        else if (tokens.type === 'list') {
          _.map(tokens.items, (listItems) => {
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent = modifiedContent + `${keyProp}\n`;
            keyPropMapping = keyPropMapping + `${keyProp}=${listItems.raw}\n`;
          });
        } else {
          modifiedContent = modifiedContent + tokens.raw;
        }

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
    });
    return null;
  }

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
      //   const courseId = await this.getCourseId(courseDetails.name);
      //   courseDetails.id = courseId;
      if (!courseDetails.logo) {
        courseDetails.logo = 'http://navgurukul.org/img/sqlogo.jpg';
      }
      return courseDetails;
    }
    return null;
  }

  static singleCourse() {
    if (process.argv.indexOf('--singleCourse') > -1) {
      return true;
    }
    return false;
  }

  static getCourseName() {
    if (process.argv.indexOf('--singleCourse') > -1) {
      const courseName = process.argv[process.argv.indexOf('--singleCourse') + 1];
      if (!courseName) {
        this.showErrorAndExit('--singleCourse course name needs to be specified.');
      }
      try {
        fs.statSync(path.join(`${__dirname}/../../curriculum/${courseName}`)); // stat
        return courseName;
      } catch (e) {
        this.showErrorAndExit(
          `The specified courseName ${courseName} doesn't exist in curriculum.`
        );
      }
    }
    return false;
  }

  static showErrorAndExit(message) {
    console.log(message);
    console.log('Fix the above error and re-run this script.');
    process.exit();
  }
}

if (!module.parent) {
  const singleCourse = CourseParser.singleCourse();
  const courseName = CourseParser.getCourseName();
  const parser = new CourseParser(singleCourse, courseName);
  parser.init().then((res) => {
    if (res) {
      console.log('Ok');
    }
  });
}
