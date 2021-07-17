/* eslint-disable class-methods-use-this */
/* eslint-disable no-empty-function */
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
  constructor(parseSingleCourse, courseFolderName) {
    this.courseDir = path.resolve('curriculum');
    this.allCourseFolder = [];
    this.courseDetails = [];
    this.exercises = [];
    // eslint-disable-next-line
    this.regex = /^.(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]).*/;
    this.parseSingleCourse = parseSingleCourse;
    this.courseFolderName = courseFolderName;
    this.programmingKeywords = [];
    this.allImages = [];
  }

  async init() {
    const keywordString = await axios.get(
      'https://raw.githubusercontent.com/navgurukul/newton/master/programming_keywords.js'
    );
    // getting keywords ("Boolean,Operator,Variable,True,False,Integer,String,Float,Conversion,iPython,Python2,Python3,Python,Indentation,Youtube,Code,Shell,Terminal,Application,Execute,File,Upload,Statement,Input,Output,Save,Error,Loop,Tab,Key,Editor,Compiler,Syntax,Interpreter,Algorithm")

    this.programmingKeywords = keywordString.data.trim().split(',');
    if (this.parseSingleCourse) {
      // addUpdate single course

      await this.parseCourseDir(this.courseFolderName, []);
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
    if (CoursesSeeder.updateDatabase()) {
      // add new course
      await this.addCourse();
      // add or update exercise
      await this.addUpdateExercise();
    }

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
    if (fs.existsSync(path)) {
      const course = {};

      // getting course details from info.md  in dictionary formate
      const courseDetails = await this.parseCourseDetails(path.replace('index.md', 'info.md'));
      if (courseDetails) {
        if (updateCourseNames.length > 0 && updateCourseNames.indexOf(courseDetails.name) < 0) {
          // Exit if course folder does not already exist in database
          return false;
        }

        this.courseDetails.push(courseDetails);
        course.courseDetails = courseDetails;

        // getting data from index.md

        const data = fs.readFileSync(path);

        // parsing index.md content from token
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
        this.parseAndUploadImage(this.allImages);
      }
    } else {
      return "Pathway doesn't exist";
    }
    return true;
  }

  /* eslint-disable */

  // converting info.md into dictionary and finding course id
  async parseCourseDetails(path) {
    if (fs.existsSync(path)) {
      // getting data from info.md
      const data = fs.readFileSync(path);

      // parsing markdown content from token
      const tokens = marked.lexer(data.toString());
      const courseDetails = {};
      const items = tokens[0].text.split('\n');
      _.map(items, (item) => {
        const split = item.split(': ');
        if (split[1]) {
          // converting data into key value pair
          courseDetails[split[0]] = split[1];
        } else {
          const logo = split[0].split(':');
          courseDetails[logo[0]] = `${logo[1]}:${logo[2]}`;
        }
      });
      const courseId = await this.getCourseId(courseDetails.name);
      courseDetails.id = courseId;

      // if there is no logo in courseDetails so by default it will return http://navgurukul.org/img/sqlogo.jpg in logo
      if (!courseDetails.logo) {
        courseDetails.logo = 'http://navgurukul.org/img/sqlogo.jpg';
      }
      // return course details
      return courseDetails;
    }
    return null;
  }
  /* eslint-enable */

  async parseExerciseDetails(file, folder, courseId) {
    const basePath = `${this.courseDir}/${folder}/${file.fileName}`;
    const baseSequenceNum = file.sequenceNum;
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
        // regex pattern to find all keywords and enclose them within tilde
        const regExPattern = new RegExp(
          `(\`){0,1}(${this.programmingKeywords.join('|')})([s|es]{0,1})(\`){0,1}`,
          'gi'
        );
        const dataInString = data
          .toString()
          .trim()
          .replace(regExPattern, (matched) => {
            if (!matched.startsWith('`')) {
              return `\`${matched}\``;
            }
            return matched;
          });

        let splitBy = [];

        // youtube data inserting into splitBy
        if (dataInString.match(/(@|!)\[.+\]\(.+\)/gi)) {
          splitBy = dataInString.match(/(@|!)\[.+\]\(.+\)/gi);
        }
        const splittedMD = [];

        // inserting all data in splittedMd list
        let dataInStringCopy = dataInString;
        if (splitBy.length > 0) {
          splitBy.forEach((v) => {
            const brokenString = dataInStringCopy.split(v);
            if (brokenString[0].trim().length > 0) splittedMD.push(brokenString[0]);
            splittedMD.push(v);
            dataInStringCopy = brokenString.slice(1).join('');
          });
          if (dataInStringCopy.trim().length > 0) {
            splittedMD.push(dataInStringCopy);
          }
        } else {
          splittedMD.push(dataInString);
        }
        let contentByParts = [];
        let onlyMarkdown = '';
        let allJSONKeys;
        let beginKeyOn = 0;
        /* eslint-disable */
        for (const md of splittedMD) {
          if (splitBy.indexOf(md) > -1) {
            // getting image from markdown for alt_text
            const imageLink = md
              .slice(md.indexOf('(') + 1, md.indexOf(')'))
              .replace(/`/g, '')
              .trim();

            // getting text of the image from markdown for alt_text
            const imageText = md.slice(md.indexOf('[') + 1, md.indexOf(']'));
            if (md.startsWith('![') && imageLink.startsWith('http')) {
              contentByParts.push(
                JSON.stringify({ type: 'image', value: { url: imageLink, text: imageText } })
              );
            } else if (md.startsWith('![') && !imageLink.startsWith('http')) {
              const imagePath = `${this.courseDir}/${folder}/${imageLink}`;
              this.allImages.push(imagePath);
              const awsS3Path = `https://${
                CONFIG.auth.aws.s3Bucket
              }.s3.ap-south-1.amazonaws.com/course_images/${imagePath.split('/curriculum/')[1]}`;
              contentByParts.push(
                JSON.stringify({ type: 'image', value: { url: awsS3Path, text: imageText } })
              );
            } else if (md.indexOf('[youtube]') > -1 || md.indexOf('[`youtube`]') > -1) {
              const yt = md.slice(md.indexOf('(') + 1, md.indexOf(')'));
              contentByParts.push(
                JSON.stringify({
                  type: 'youtube',
                  value: yt,
                })
              );
            }
            onlyMarkdown += md;
          } else {
            const tokens = marked.lexer(md);
            _.map(tokens, (exerciseContent) => {
              if (exerciseContent.lang === 'ngMeta') {
                exercise.name = exerciseContent.text
                  .replace('name: ', '')
                  .replace('\nsubmission_type: url', '');
              }
            });
            const { beginKeyFrom, jsonKeys, ...contents } = JSON.parse(
              await this.parseMarkdownContent(path, tokens, beginKeyOn)
            )[0];
            beginKeyOn = beginKeyFrom;
            contentByParts.push(JSON.stringify(contents));
            onlyMarkdown += contents.value;
            allJSONKeys = { ...allJSONKeys, ...jsonKeys };
          }
        }

        /* eslint-disable */
        contentByParts = JSON.stringify(contentByParts);
        const name = file.fileName.replace('.md', '').replace(/`/g, '').trim();
        exercise.name = exercise.name ? exercise.name.replace(/`/g, '').trim() : name;
        exercise.sequence_num = baseSequenceNum;
        exercise.course_id = courseId;
        exercise.content = contentByParts;
        exercise.slug = path
          .split(`${this.courseDir}/`)
          .slice(-1)[0]
          .replace('/', '__')
          .replace('.md', '');

        exercise.github_link = `https://github.com/navgurukul/newton/tree/master/${
          path.split(`${this.courseDir}/`).slice(-1)[0]
        }`;
        const fileRelPath = file.fileName;

        await this.writeFiles({
          fileRelPath,
          name,
          onlyMarkdown,
          allJSONKeys,
        });

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
      // reading data inside path
      const data = fs.readFileSync(childExercisesPath);
      // regex pattern to find all keywords and enclose them within tilde
      const regExPattern = new RegExp(
        `(\`){0,1}(${this.programmingKeywords.join('|')})([s|es]{0,1})(\`){0,1}`,
        'gi'
      );

      const dataInString = data
        .toString()
        .trim()
        .replace(regExPattern, (matched) => {
          if (!matched.startsWith('`')) {
            return `\`${matched}\``;
          }
          return matched;
        });
      let splitBy = [];

      //youtube data insert into splitBy

      if (dataInString.match(/(@|!)\[.+\]\(.+\)/gi)) {
        splitBy = dataInString.match(/(@|!)\[.+\]\(.+\)/gi);
      }
      const splittedMD = [];

      // inserting all data in splittedMd list

      let dataInStringCopy = dataInString;
      if (splitBy.length > 0) {
        splitBy.forEach((v) => {
          let brokenString = dataInStringCopy.split(v);
          splittedMD.push(brokenString[0]);
          splittedMD.push(v);
          dataInStringCopy = brokenString.slice(1).join('');
        });
        if (dataInStringCopy.trim().length > 0) {
          splittedMD.push(dataInStringCopy);
        }
      } else {
        splittedMD.push(dataInString);
      }
      let contentByParts = [];
      let onlyMarkdown = '';
      let allJSONKeys;
      let beginKeyOn = 0;

      /* eslint-disable */

      for (const md of splittedMD) {
        if (splitBy.indexOf(md) > -1) {
          // getting image from markdown for alt_text
          const imageLink = md
            .slice(md.indexOf('(') + 1, md.indexOf(')'))
            .replace(/`/g, '')
            .trim();

          // getting text of the image from markdown for alt_text
          const imageText = md.slice(md.indexOf('[') + 1, md.indexOf(']'));
          if (md.startsWith('![') && imageLink.startsWith('http')) {
            contentByParts.push(
              JSON.stringify({ type: 'image', value: { url: imageLink, text: imageText } })
            );
          } else if (md.startsWith('![') && !imageLink.startsWith('http')) {
            const imagePath = `${path.split(childExercisesFile.fileName).join('')}${imageLink}`;
            this.allImages.push(imagePath);
            const awsS3Path = `https://${
              CONFIG.auth.aws.s3Bucket
            }.s3.ap-south-1.amazonaws.com/course_images/${imagePath.split('/curriculum/')[1]}`;
            contentByParts.push(
              JSON.stringify({ type: 'image', value: { url: awsS3Path, text: imageText } })
            );
          } else if (md.indexOf('[youtube]') > -1 || md.indexOf('[`youtube`]') > -1) {
            const yt = md.slice(md.indexOf('(') + 1, md.indexOf(')'));
            contentByParts.push(
              JSON.stringify({
                type: 'youtube',
                value: yt,
              })
            );
          }
          onlyMarkdown += md;
        } else {
          const tokens = marked.lexer(md);
          _.map(tokens, (exerciseContent) => {
            if (exerciseContent.lang === 'ngMeta') {
              exercise.name = exerciseContent.text
                .replace('name: ', '')
                .replace('\nsubmission_type: url', '');
            }
          });

          const { beginKeyFrom, jsonKeys, ...contents } = JSON.parse(
            await this.parseMarkdownContent(path, tokens, beginKeyOn)
          )[0];
          beginKeyOn = beginKeyFrom;
          contentByParts.push(JSON.stringify(contents));
          onlyMarkdown += contents.value;
          allJSONKeys = { ...allJSONKeys, ...jsonKeys };
        }
      }

      /* eslint-enable */
      // getting child exercise
      contentByParts = JSON.stringify(contentByParts, null, 2);
      const name = childExercisesFile.fileName.replace('.md', '').replace(/`/g, '').trim();
      exercise.name = exercise.name ? exercise.name.replace(/`/g, '').trim() : name;
      exercise.course_id = courseId;
      exercise.sequence_num = childExercisesFile.sequenceNum;
      exercise.content = contentByParts;
      exercise.slug = childExercisesPath
        .split(`${this.courseDir}/`)
        .slice(-1)[0]
        .replace('/', '__')
        .replace('.md', '');
      exercise.github_link = `https://github.com/navgurukul/newton/tree/master/${
        childExercisesPath.split(`${this.courseDir}/`).slice(-1)[0]
      }`;
      const partPath = path.split('curriculum/')[1];
      const fileRelPath = partPath.split('/').slice(1).join('/');
      await this.writeFiles({
        fileRelPath,
        name,
        onlyMarkdown,
        allJSONKeys,
      });

      if (exercise.name.length < 100) {
        return exercise;
      }
      return null;
    }
    return null;
  }

  async parseAndUploadImage(imageDir) {
    /* eslint-disable */
    for (const img of imageDir) {
      this.cloudPath = img.split('curriculum/')[1];
      this.extn = img.split('.').pop();
      this.contentType = 'application/octet-stream';
      this.contentType = `image/${this.extn}`;
      if (fs.existsSync(img)) {
        this.imageBuffer = fs.readFileSync(img);
      } else {
        console.log(`Image asset ${img} doesn't exists`);
      }

      const params = {
        Bucket: CONFIG.auth.aws.s3Bucket,
        Key: `course_images/${this.cloudPath}`,
        Body: this.imageBuffer,
        ContentType: this.contentType,
        ACL: 'public-read',
      };
      const allUploadedImagesPath = [];
      try {
        allUploadedImagesPath.push(await s3.upload(params).promise());
        console.log(`Successfully uploaded ${img}`);
        console.log(allUploadedImagesPath);
      } catch (err) {
        console.log('Error uploading images to s3');
      }
    }
    /* eslint-enable */
  }

  async parseMarkdownContent(filePath, tokens, beginKeyOn) {
    const exerciseName = filePath.split('/').pop().split('.')[0];
    let keyNumber = beginKeyOn;
    let keyProp;
    let modifiedContent = '';
    const keyPropMapping = {};

    let partPath = filePath.split('curriculum/')[1];
    const exrRelPath = partPath.split('/').slice(1).join('/');

    partPath = partPath.split('/').slice(0, -1).join('/');

    this.createDirs(exrRelPath);
    const exercise = [];
    let typingContent = [];

    _.map(tokens, (token) => {
      // parse external links
      if (token.type === 'paragraph' && token.text.match(/\[.+\]\(.+\)/i)) {
        _.forEach(token.tokens, (innerToken) => {
          if (innerToken.type === 'link') {
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent += `[${keyProp}](${innerToken.href})\n`;
            keyPropMapping[keyProp] = `${innerToken.text.replace(/`/g, '').trim()}\n`;
          } else if (innerToken.type === 'text') {
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent += keyProp;
            keyPropMapping[keyProp] = `${innerToken.text.replace(/`/g, '').trim()}\n`;
          }
        });
      } else if (token.type === 'code' && token.lang === 'ngMeta') {
        token.text = token.text.replace(/`/g, '');
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        // eslint-disable-next-line
        modifiedContent += '```' + token.lang + '\n' + keyProp + '\n' + '```' + '\n\n';
        keyPropMapping[keyProp] = `${token.text.trim()}\n`;
      } else if (
        token.type === 'code' &&
        ['python', 'html', 'css', 'javascript', 'json', 'bash', 'sh', ''].indexOf(token.lang) > -1
      ) {
        token.text = token.text.replace(/`/g, '');
        // eslint-disable-next-line
        modifiedContent += '```' + token.lang + '\n' + token.text + '\n' + '```' + '\n';
      } else if (
        token.type === 'code' &&
        (token.lang === 'typing' || token.lang === 'trytyping' || token.lang === 'practicetyping')
      ) {
        typingContent = [];
        // eslint-disable-next-line
        modifiedContent += '```' + token.lang + '\n' + token.text + '\n' + '```' + '\n';

        if (token.lang === 'practicetyping') {
          const [keys, suggested_words] = token.text.split('\n');
          typingContent.push({ type: token.lang, value: keys.split(''), suggested_words });
        } else {
          typingContent.push({ type: token.lang, value: token.text.split('') });
        }
        exercise.push(typingContent[0]);
      } else if (token.type === 'space') {
        modifiedContent += token.raw; // Always omit first \n ;
      }

      // hr
      else if (token.type === 'hr') {
        modifiedContent += token.raw; // Always omit first \n ;
      }

      // table has innerTokens but has more than one tokens due to which it is parsed more than once
      else if (token.type === 'table') {
        let tableHeaderContent = '|';
        let tableDivider = '|';
        let formingTableContent = '';

        _.map(token.header, (tableHeader) => {
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          tableHeaderContent += `${keyProp}|`;
          tableDivider += '-----------|';
          keyPropMapping[keyProp] = `${tableHeader}`;
        });
        formingTableContent = `${formingTableContent + tableHeaderContent}\n`;
        formingTableContent = `${formingTableContent + tableDivider}\n`;

        _.map(token.cells, (cellRow) => {
          let tableCellContent = '|';
          _.map(cellRow, (cellValue) => {
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            tableCellContent += `${keyProp}|`;
            keyPropMapping[keyProp] = `${cellValue}`;
          });
          formingTableContent = `${formingTableContent + tableCellContent}\n`;
        });
        modifiedContent += `${formingTableContent}\n`;
      }
      // tokens with inner tokens that doesn't contain an image or link
      else if (
        token.type !== 'table' &&
        token.tokens &&
        _.findIndex(token.tokens, { type: 'image' }) < 0 &&
        _.findIndex(token.tokens, { type: 'link' }) < 0
      ) {
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent += `${keyProp}\n`;
        keyPropMapping[keyProp] = `${token.raw}\n`;
      } else if (token.type === 'list') {
        _.map(token.items, (listItems) => {
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;

          // if list items are MD links
          if (listItems.text.match(/(\[.+\])(\((http).+\))/g)) {
            const linkText = listItems.text.substr(
              listItems.text.indexOf('[') + 1,
              listItems.text.indexOf(']') - 1
            );
            const hrefLink = listItems.text.substr(
              listItems.text.indexOf('('),
              listItems.text.indexOf(')')
            );
            modifiedContent += `${listItems.raw.substr(0, 1)} [${keyProp}]${hrefLink}\n`;
            keyPropMapping[keyProp] = `${linkText}\n`;
          } else if (listItems.raw.indexOf('```') > -1) {
            _.map(listItems.tokens, (innerListItemToken) => {
              if (
                innerListItemToken.type === 'code' &&
                ['python', 'html', 'css', 'javascript', 'json', 'bash', 'sh'].indexOf(
                  innerListItemToken.lang
                ) > -1
              ) {
                innerListItemToken.text = innerListItemToken.text.replace(/`/g, '');
                /* eslint-disable */
                modifiedContent +=
                  '```' +
                  innerListItemToken.lang +
                  '\n' +
                  innerListItemToken.text +
                  '\n' +
                  '```' +
                  '\n';
                /* eslint-enable */
              } else if (
                innerListItemToken.type === 'code' &&
                (innerListItemToken.lang === 'typing' ||
                  innerListItemToken.lang === 'trytyping' ||
                  innerListItemToken.lang === 'practicetyping') > -1
              ) {
                typingContent = [];
                /* eslint-disable */
                modifiedContent +=
                  '```' +
                  innerListItemToken.lang +
                  '\n' +
                  innerListItemToken.text +
                  '\n' +
                  '```' +
                  '\n';
                /* eslint-enable */
                if (innerListItemToken.lang === 'practicetyping') {
                  const [keys, suggested_words] = innerListItemToken.text.split('\n');
                  // typingContent.type = innerListItemToken.lang;
                  // typingContent.value = keys.split('');
                  // typingContent = { ...typingContent, suggested_words };
                  typingContent.push({
                    type: innerListItemToken.lang,
                    value: keys.split(''),
                    suggested_words,
                  });
                } else {
                  typingContent.push({
                    type: innerListItemToken.lang,
                    value: innerListItemToken.text.split(''),
                  });
                }
                exercise.push(typingContent[0]);
              } else {
                modifiedContent += `${listItems.raw.trim().split(' ')[0]} ${keyProp}\n`;
                keyPropMapping[keyProp] = `${innerListItemToken.text}\n`;
              }
            });
          } else {
            modifiedContent += `${listItems.raw.trim().split(' ')[0]} ${keyProp}\n`;
            keyPropMapping[keyProp] = `${listItems.text}\n`;
          }
        });
      } else if (token.type === 'paragraph' && token.tokens) {
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent += `${keyProp}\n`;
        keyPropMapping[keyProp] = `${token.raw}\n`;
      } else if (token.type === 'code') {
        token.text = token.text.replace(/`/g, '');
        // eslint-disable-next-line
        modifiedContent += '```' + token.lang + '\n' + token.text + '\n' + '```' + '\n';
      } else {
        // console.log(token);
      }
    });
    if (typingContent.length > 0) {
      exercise.push(...typingContent);
    }

    exercise.push({
      type: 'markdown',
      value: modifiedContent,
      jsonKeys: keyPropMapping,
      beginKeyFrom: keyNumber,
    });

    /* eslint-enable */
    const formattedExercise = _.filter(exercise, (x) => x.value);
    return JSON.stringify(formattedExercise);
  }

  async createDirs(relPath) {
    let createPath = '';
    if (relPath.indexOf('/') > -1) {
      createPath = relPath.split('/').slice(0, -1).join('/');
    }
    if (!fs.existsSync(`${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT`)) {
      fs.mkdirSync(`${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT`);
      fs.mkdirSync(`${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/MODIFIED_FILES`);
      fs.mkdirSync(`${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES`);
    }

    if (
      createPath &&
      !fs.existsSync(
        `${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${createPath}`
      )
    ) {
      fs.mkdirSync(
        `${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${createPath}`
      );
      fs.mkdirSync(
        `${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${createPath}`
      );
    }
  }

  async writeFiles({ fileRelPath, name, onlyMarkdown, allJSONKeys }) {
    const courseName = this.courseDetails[0].name;
    if (fileRelPath.indexOf('/') > -1) {
      const subDir = fileRelPath.split('/')[0];
      fs.writeFileSync(
        path.resolve(
          `${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${subDir}/${courseName}_${name}.md`
        ),
        onlyMarkdown
      );

      fs.writeFileSync(
        path.resolve(
          `${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${subDir}/${courseName}_${name}_en.json`
        ),
        JSON.stringify(allJSONKeys, null, '\t')
      );
    } else {
      fs.writeFileSync(
        path.resolve(
          `${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${courseName}_${name}.md`
        ),
        onlyMarkdown
      );

      fs.writeFileSync(
        path.resolve(
          `${this.courseDir}/${this.courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${courseName}_${name}_en.json`
        ),
        JSON.stringify(allJSONKeys, null, '\t')
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

  // it will return courses id by taking input course name
  async getCourseId(name) {
    const res = await axios.get(`http://localhost:${CONFIG.seeder.seedPort}/courses/name`, {
      params: { name },
    });

    // getting id from res.data
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

  // if you are putting --parseSingleCourse so it will return true otherwise it will return false
  static parseSingleCourseFlag() {
    if (process.argv.indexOf('--parseSingleCourse') > -1) {
      return true;
    }
    return false;
  }

  // if you are putting --updateDB so it will return true otherwise it will return false
  static updateDatabase() {
    if (process.argv.indexOf('--updateDB') > -1) {
      return true;
    }
    return false;
  }

  // it will return course name
  static getCourseFolderName() {
    // getting folder name
    if (process.argv.indexOf('--parseSingleCourse') > -1) {
      const courseFolderName = process.argv[process.argv.indexOf('--parseSingleCourse') + 1];
      if (!courseFolderName) {
        this.showErrorAndExit('--parseSingleCourse course name needs to be specified.');
      }
      try {
        fs.statSync(path.resolve(`curriculum/${courseFolderName}`)); // stat
        return courseFolderName;
      } catch (e) {
        this.showErrorAndExit(
          `The specified courseFolderName ${courseFolderName} doesn't exist in curriculum.`
        );
      }
    }
    // eslint-disable-next-line
    console.log('Specify correct flag');
    process.exit(1);
    return false;
  }
}

if (!module.parent) {
  process.umask(0);
  const parseSingleCourse = CoursesSeeder.parseSingleCourseFlag();
  const courseFolderName = CoursesSeeder.getCourseFolderName();
  const seeder = new CoursesSeeder(parseSingleCourse, courseFolderName);
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
