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
                `${this.courseDir}/${folder}/${allExerciseFile.fileName.trim()}`
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
                `${
                  this.courseDir
                }/${folder}/${allExerciseFile.fileName.trim()}/${childExercisesFile.text.trim()}`
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
    const filePathArr = filePath.split('/');
    let parentExer = null;
    if (!filePathArr[filePathArr.indexOf(this.courseName) + 1].match(/.md/g)) {
      parentExer = filePathArr[filePathArr.indexOf(this.courseName) + 1];
    }
    // console.log(exerWithChild);
    // console.log(filePathArr);

    // console.log(filePathArr);
    const mdContent = fs.readFileSync(filePath).toString();
    const parsedContent = marked.lexer(mdContent);
    let keyNumber = 0;
    let keyProp;

    let modifiedContent = '';
    let keyPropMapping = '';
    this.createDirs(`${this.courseDir}/${this.courseName}`, parentExer);
    if (parentExer) {
      _.map(parsedContent, (tokens) => {
        if (tokens.tokens) {
          _.map(tokens.tokens, (innerToken) => {
            // space
            if (innerToken.type === 'text' && innerToken.text === '\n') {
              modifiedContent = modifiedContent + innerToken.text;
            }
            // paragraph - links
            else if (innerToken.type === 'link') {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent = modifiedContent + `[${keyProp}](${innerToken.href})\n`;
              keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text.trim()}\n`;
            } // em
            else if (innerToken.type === 'em') {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent = modifiedContent + `*${keyProp}*`;
              keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text.trim()}\n`;
            } //bold
            else if (innerToken.type === 'strong') {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent = modifiedContent + `**${keyProp}**`;
              keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text.trim()}\n`;
            }
            // headings (headings has inner tokens so it never goes to the else part)
            else if (tokens.type === 'heading') {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}\n`;
              modifiedContent = modifiedContent + `${tokens.raw.split(' ')[0]} ${keyProp}\n`;
              keyPropMapping = keyPropMapping + `${keyProp}=${tokens.text}\n`;
            } // table
            else if (tokens.type === 'table') {
              let tableIndex = 0;
              let tableHeaderContent = '|';
              console.log(tokens);
              //   _.map(tokens.header, (tableHeader, index) => {
              //     console.log(tableHeader);
              //     keyNumber += 1;
              //     keyProp = `${exerciseName}_key${keyNumber}`;
              //     tableHeaderContent = tableHeaderContent + `${keyProp}|`;
              //     keyPropMapping = keyPropMapping + `${keyProp}=${tableHeader}\n`;
              //   });
              modifiedContent = modifiedContent + tableHeaderContent + '\n';
              //   console.log(modifiedContent);
            }
            // normal text
            else if (innerToken.type === 'text' && innerToken.text !== '\n') {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent = modifiedContent + `${keyProp}`;
              keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text}\n`;
            } else if (innerToken.type !== 'br') {
              //   console.log(innerToken);
              //   console.log(_.flatten(innerToken));
              //   modifiedContent = modifiedContent + innerToken.text.trim();
            }
          });
        } else {
          // code
          if (tokens.type === 'code' && tokens.lang === 'ngMeta') {
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent =
              modifiedContent + '```' + tokens.lang + '\n' + keyProp + '\n' + '```' + '\n';
            keyPropMapping = `${keyProp}=${tokens.text.trim()}\n`;
          }
          // list
          else if (tokens.type === 'list') {
            _.map(tokens.items, (listItems) => {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent =
                modifiedContent + `${listItems.raw.trim().split(' ')[0]}${keyProp}\n`;
              keyPropMapping = keyPropMapping + `${keyProp}=${listItems.text}\n`;
            });
          } else if (tokens.type !== 'br') {
            // modifiedContent = modifiedContent + innerToken.text.trim();
          }

          fs.writeFileSync(
            path.resolve(
              `${this.courseDir}/${this.courseName}/PARSED_CONTENT/MODIFIED_FILES/${parentExer}/${this.courseName}_${exerciseName}.md`
            ),
            modifiedContent
          );

          fs.writeFileSync(
            path.resolve(
              `${this.courseDir}/${this.courseName}/PARSED_CONTENT/PROPERTIES_FILES/${parentExer}/${this.courseName}_${exerciseName}_en.properties`
            ),
            keyPropMapping
          );
        }
      });
    } else {
      _.map(parsedContent, (tokens) => {
        if (tokens.tokens) {
          _.map(tokens.tokens, (innerToken) => {
            // space
            if (innerToken.type === 'text' && innerToken.text === '\n') {
              modifiedContent = modifiedContent + innerToken.text;
            }

            // paragraph - link
            else if (innerToken.type === 'link') {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent = modifiedContent + `[${keyProp}](${innerToken.href})\n`;
              keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text.trim()}\n`;
            }

            // headings (headings has inner tokens so it never goes to the else part)
            else if (tokens.type === 'heading') {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent =
                modifiedContent + `${tokens.raw.trim().split(' ')[0]} ${keyProp}\n\n`;
              keyPropMapping = keyPropMapping + `${keyProp}=${tokens.text.trim()}\n`;
            }

            // normal text
            else if (innerToken.type === 'text' && innerToken.text !== '\n') {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent = modifiedContent + `${keyProp}\n`;
              keyPropMapping = keyPropMapping + `${keyProp}=${innerToken.text.trim()}\n`;
            } else {
              modifiedContent = modifiedContent + innerToken.raw.trim();
            }
          });
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
        } else {
          // code
          if (tokens.type === 'code' && tokens.lang === 'ngMeta') {
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent =
              modifiedContent + '```' + tokens.lang + '\n' + keyProp + '\n' + '```' + '\n';
            keyPropMapping = `${keyProp}=${tokens.text.trim()}\n`;
          }

          // list
          else if (tokens.type === 'list') {
            _.map(tokens.items, (listItems) => {
              keyNumber += 1;
              keyProp = `${exerciseName}_key${keyNumber}`;
              modifiedContent =
                modifiedContent + `${listItems.raw.trim().split(' ')[0]}${keyProp}\n`;
              keyPropMapping = keyPropMapping + `${keyProp}=${listItems.text.trim()}\n`;
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
    }
    return null;
  }

  async createDirs(rootDir, parentDir) {
    if (!fs.existsSync(`${rootDir}/PARSED_CONTENT`)) {
      fs.mkdirSync(`${rootDir}/PARSED_CONTENT`);
      fs.mkdirSync(`${rootDir}/PARSED_CONTENT/MODIFIED_FILES`);
      fs.mkdirSync(`${rootDir}/PARSED_CONTENT/PROPERTIES_FILES`);
    }

    if (parentDir) {
      if (!fs.existsSync(`${rootDir}/PARSED_CONTENT/PROPERTIES_FILES/${parentDir}`)) {
        fs.mkdirSync(`${rootDir}/PARSED_CONTENT/PROPERTIES_FILES/${parentDir}`);
      }

      if (!fs.existsSync(`${rootDir}/PARSED_CONTENT/MODIFIED_FILES/${parentDir}`)) {
        fs.mkdirSync(`${rootDir}/PARSED_CONTENT/MODIFIED_FILES/${parentDir}`);
      }
    }
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
