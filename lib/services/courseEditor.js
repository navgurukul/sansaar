const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { val } = require('objection');
const CONFIG = require('../config/index');
const { errorHandler } = require('../errorHandling');

module.exports = class CourseEditorService extends Schmervice.Service {
  async createCourses(v1Courses) {
    const { Exercises, CourseVersions } = this.server.models();
    try {
      // eslint-disable-next-line
      for (const course of v1Courses) {
        const courseSingle = _.pick(course, ['name', 'logo', 'short_description']);
        courseSingle.lang_available = val('en').asArray().castTo('text[]');
        if (!fs.existsSync(`curriculum_new/${courseSingle.name}`)) {
          fs.mkdirSync(`curriculum_new/${courseSingle.name}`);
        }
        if (!fs.existsSync(`curriculum_new/${courseSingle.name}/v1`)) {
          fs.mkdirSync(`curriculum_new/${courseSingle.name}/v1`);
        }
        // eslint-disable-next-line
        const courseExercises = await Exercises.query()
          .where('course_id', course.id)
          .orderBy('sequence_num');
        if (courseExercises.length > 0) {
          // eslint-disable-next-line
          for (const singleExercise of courseExercises) {
            const exerciseData = {};
            exerciseData.name =
              singleExercise.parent_exercise_id == null
                ? singleExercise.name
                : singleExercise.slug
                    .substring(
                      singleExercise.slug.lastIndexOf('__') + 2,
                      singleExercise.slug.lastIndexOf('_')
                    )
                    .replace(/\//g, '_');
            const filePath = singleExercise.slug.replace(/__/g, '/').replace(/_([^_]*)$/, '.$1');
            if (fs.existsSync(`curriculum/${filePath}`)) {
              const dataInString = fs.readFileSync(`curriculum/${filePath}`);
              exerciseData.description = `information about ${exerciseData.name}`;
              exerciseData.course_name = courseSingle.name;
              exerciseData.content = JSON.stringify(JSON.parse(dataInString.toString().trim()));
              exerciseData.sequence_num = singleExercise.sequence_num;
              exerciseData.type = 'exercise';
              // eslint-disable-next-line
              await this.addExercises(exerciseData);
            }
          }
        }
        const data = {};
        data.course_name = courseSingle.name;
        data.version = 'v1';
        // eslint-disable-next-line
        await CourseVersions.query().insert(data);
      }
      return [null, v1Courses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async addExercises(data) {
    try {
      const courseFolderName = `curriculum_new/${data.course_name}/v1`;
      if (fs.existsSync(`${courseFolderName}`)) {
        fs.writeFileSync(
          path.resolve(`${courseFolderName}/${data.name}.json`),
          JSON.stringify(JSON.parse(data.content), null, '\t')
        );
      }
      // eslint-disable-next-line
      const [err, exerciseContant] = await this.parsedModifiedContent(
        courseFolderName,
        data.name,
        data.content,
        'curriculum_new'
      );
      data.content = exerciseContant;
      return [null, courseFolderName];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async parsedModifiedContent(
    courseFolderName,
    exerciseName,
    exerciseContent,
    basePath = 'curriculum_new'
  ) {
    try {
      const contentByParts = [];
      let contentKeys = '';
      let allJSONKeys;
      let beginKeyOn = 0;
      const parsedDataInString = JSON.parse(exerciseContent);
      // basePath=basePath.split("")
      _.map(parsedDataInString, (img) => {
        if (img.component === 'image') {
          if (!img.value.startsWith('http')) {
            const imagePath = `${courseFolderName}/${img.value}`;
            const awsS3Path = `https://${
              CONFIG.auth.aws.s3Bucket
            }.s3.ap-south-1.amazonaws.com/course_images/${imagePath.split(`curriculum_new/`)[1]}`;
            img.value = awsS3Path;
          }
        }
      });

      const parsedContent = JSON.parse(
        await this.parseIntoModifiedContent(
          `${courseFolderName}/${exerciseName}`,
          parsedDataInString,
          beginKeyOn
        )
      );
      if (parsedContent.length > 0) {
        const { beginKeyFrom, jsonKeys, ...contents } = parsedContent[0];
        beginKeyOn = beginKeyFrom;
        contentKeys += JSON.stringify(contents.value, null, 2);
        allJSONKeys = { ...allJSONKeys, ...jsonKeys };
        contentByParts.push(JSON.stringify(contents));
      }
      await this.createParsedContent(
        courseFolderName,
        exerciseName,
        contentKeys,
        allJSONKeys,
        basePath
      );
      const allContentByParts = JSON.stringify(contentByParts);
      return [null, allContentByParts];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // eslint-disable-next-line
  async parseIntoModifiedContent(filePath, jsonContent, beginKeyOn) {
    const exerciseName = filePath.split('/').pop().split('.')[0];
    let keyNumber = beginKeyOn;
    let keyProp;
    const keyPropMapping = {};
    const exercise = [];
    _.map(jsonContent, (jsonData) => {
      if (
        jsonData.component !== 'code' &&
        jsonData.component !== 'table' &&
        jsonData.component !== 'youtube' &&
        jsonData.component !== 'image' &&
        jsonData.component !== 'banner' &&
        jsonData.component !== 'options' &&
        jsonData.component !== 'output'
      ) {
        let modifiedContent = '';
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent += `${keyProp}`;
        keyPropMapping[keyProp] = `${jsonData.value}`;
        jsonData.value = modifiedContent;
      } else if (jsonData.component === 'table') {
        _.map(jsonData.value, (table) => {
          let modifiedContent = '';
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          modifiedContent += `${keyProp}`;
          keyPropMapping[keyProp] = `${table.header}`;
          const itemsTable = [];
          _.map(table.items, (tokenText) => {
            let modifiedContentItems = '';
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContentItems += `${keyProp}`;
            keyPropMapping[keyProp] = `${tokenText}`;
            itemsTable.push(modifiedContentItems);
          });
          table.header = modifiedContent;
          table.items = itemsTable;
        });
      } else if (jsonData.component === 'image') {
        let modifiedContent = '';
        keyNumber += 1;
        keyProp = `${exerciseName}_key${keyNumber}`;
        modifiedContent += `${keyProp}`;
        keyPropMapping[keyProp] = `${jsonData.alt}`;
        jsonData.alt = modifiedContent;
      } else if (jsonData.component === 'options') {
        // eslint-disable-next-line
        for (const i in jsonData.value) {
          let modifiedContent = '';
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          modifiedContent += `${keyProp}`;
          keyPropMapping[keyProp] = `${jsonData.value[i]}`;
          jsonData.value[i] = modifiedContent;
        }
      } else if (jsonData.component === 'output') {
        _.forEach(jsonData.value, (innerList) => {
          _.forEach(innerList, (innerToken) => {
            let modifiedContent = '';
            keyNumber += 1;
            keyProp = `${exerciseName}_key${keyNumber}`;
            modifiedContent += `${keyProp}`;
            keyPropMapping[keyProp] = `${innerToken.value}`;
            innerToken.value = modifiedContent;
          });
        });
      }
    });
    exercise.push({
      value: jsonContent,
      jsonKeys: keyPropMapping,
      beginKeyFrom: keyNumber,
    });

    /* eslint-enable */
    const formattedExercise = _.filter(exercise, (x) => x.value);
    return JSON.stringify(formattedExercise);
  }

  // eslint-disable-next-line
  async createParsedContent(
    courseFolderName,
    exerciseFileName,
    contentKeys,
    allJSONKeys,
    basePath = 'curriculum_new'
  ) {
    if (!fs.existsSync(`${courseFolderName}/PARSED_CONTENT`)) {
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT`);
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES`);
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES`);
    }
    let partPath = courseFolderName.split(`${basePath}/`)[1];
    partPath = partPath.split('/');
    fs.writeFileSync(
      path.resolve(
        `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${exerciseFileName}.json`
      ),
      contentKeys
    );
    fs.writeFileSync(
      path.resolve(
        `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${exerciseFileName}_en.json`
      ),
      JSON.stringify(allJSONKeys, null, '\t')
    );
  }

  async findDetailInCourseVersionsById(course_name, lang = 'en') {
    const { CourseVersions } = this.server.models();
    let course_version;
    try {
      course_version = await CourseVersions.query()
        .where('course_name', course_name)
        .andWhere('lang', lang);
      return [null, course_version];
    } catch (err) {
      const error = errorHandler(err);
      return [error, null];
    }
  }

  // eslint-disable-next-line
  async getCourseExerciseForCourseEditor(
    modifiedFiledir,
    propertiesFiledir,
    course_name,
    lang = 'en'
  ) {
    try {
      const exercise = [];
      const filenames = fs.readdirSync(modifiedFiledir);
      let sequence = Math.floor(Math.random() * 1000 + 1);
      filenames.forEach((file) => {
        const exerciseData = {};
        const file_name = file.split('.');
        const exercise_name = file_name.slice(0, file_name.length - 1).join('.');
        const name = exercise_name.split('_');
        exerciseData.name = name.slice(2).join('_');
        exerciseData.course_name = course_name;
        const modifiedFile = `${modifiedFiledir}/${file}`;
        const propertiesFile = `${propertiesFiledir}/${exercise_name}_${lang}.json`;
        if (fs.existsSync(modifiedFile)) {
          const modifiedDataInString = JSON.parse(fs.readFileSync(modifiedFile));
          const propertiesDataInString = JSON.parse(fs.readFileSync(propertiesFile));
          _.map(modifiedDataInString, (modifiedCont) => {
            if (modifiedCont.component === 'image') {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(modifiedCont.alt)) {
                modifiedCont.alt = propertiesDataInString[modifiedCont.alt];
              }
            } else if (modifiedCont.component === 'table') {
              _.map(modifiedCont.value, (tableDetails) => {
                // eslint-disable-next-line
                if (propertiesDataInString.hasOwnProperty(tableDetails.header)) {
                  tableDetails.header = propertiesDataInString[tableDetails.header];
                }
                // eslint-disable-next-line
                for (const item in tableDetails.items) {
                  // eslint-disable-next-line
                  if (propertiesDataInString.hasOwnProperty(tableDetails.items[item])) {
                    tableDetails.items[item] = propertiesDataInString[tableDetails.items[item]];
                  }
                }
              });
            } else if (modifiedCont.component === 'options') {
              // eslint-disable-next-line
              for (const element in modifiedCont.value) {
                // eslint-disable-next-line
                if (propertiesDataInString.hasOwnProperty(modifiedCont.value[element])) {
                  modifiedCont.value[element] = propertiesDataInString[modifiedCont.value[element]];
                }
              }
            } else if (modifiedCont.component === 'output') {
              _.forEach(modifiedCont.value, (innerList) => {
                _.forEach(innerList, (innerToken) => {
                  // eslint-disable-next-line
                  if (propertiesDataInString.hasOwnProperty(innerToken.value)) {
                    innerToken.value = propertiesDataInString[innerToken.value];
                  }
                });
              });
            } else {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(modifiedCont.value)) {
                modifiedCont.value = propertiesDataInString[modifiedCont.value];
              }
            }
          });
          exerciseData.content = modifiedDataInString;
        }
        exerciseData.content_type = 'exercise';
        exerciseData.sequence_num = sequence;
        sequence += 1;
        exercise.push(exerciseData);
      });
      return [null, exercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateSingleExercises(courseFolderName, exerciseName, data) {
    if (!fs.existsSync(`${courseFolderName}/${exerciseName}.json`)) {
      return [null, 'notUpdated'];
    }
    try {
      if (data.name !== undefined && data.content === undefined) {
        let partPath = courseFolderName.split('curriculum_new/')[1];
        partPath = partPath.split('/');
        if (fs.existsSync(`${courseFolderName}`)) {
          const courseData = fs.readFileSync(`${courseFolderName}/${exerciseName}.json`);
          const allJsonData = courseData.toString().trim();
          fs.renameSync(
            `${courseFolderName}/${exerciseName}.json`,
            `${courseFolderName}/${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}.json`,
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}_en.json`,
            `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${data.name}_en.json`
          );
          await this.parsedModifiedContent(courseFolderName, data.name, allJsonData);
        }
      } else if (data.content !== undefined && data.name === undefined) {
        if (fs.existsSync(`${courseFolderName}`)) {
          fs.writeFileSync(
            path.resolve(`${courseFolderName}/${exerciseName}.json`),
            JSON.stringify(JSON.parse(data.content), null, '\t')
          );
        }
        await this.parsedModifiedContent(courseFolderName, exerciseName, data.content);
      } else if (data.content !== undefined && data.name !== undefined) {
        let partPath = courseFolderName.split('curriculum_new/')[1];
        partPath = partPath.split('/');
        if (fs.existsSync(`${courseFolderName}`)) {
          fs.renameSync(
            `${courseFolderName}/${exerciseName}.json`,
            `${courseFolderName}/${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}.json`,
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${partPath[1]}_${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${exerciseName}_en.json`,
            `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${partPath[1]}_${data.name}_en.json`
          );
          if (fs.existsSync(`${courseFolderName}`)) {
            fs.writeFileSync(
              path.resolve(`${courseFolderName}/${data.name}.json`),
              JSON.stringify(JSON.parse(data.content), null, '\t')
            );
          }

          await this.parsedModifiedContent(courseFolderName, data.name, data.content);
        }
      }
      return [null, 'updated'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async copyFolder(folderName, courseName, version) {
    try {
      let result = false;
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName);
        result = true;
      }
      if (result) {
        fs.copySync(`curriculum_new/${courseName}/${version}`, folderName);
      }
      if (result) {
        if (fs.existsSync(`${folderName}/PARSED_CONTENT`)) {
          fs.removeSync(`${folderName}/PARSED_CONTENT`);
        }
        const filenames = fs.readdirSync(folderName);
        // eslint-disable-next-line
        for (const i in filenames) {
          const file_name = filenames[i].split('.');
          const exercise_name = file_name.slice(0, file_name.length - 1).join('.');
          const courseData = fs.readFileSync(`${folderName}/${filenames[i]}`);
          const allJsonData = courseData.toString().trim();
          // eslint-disable-next-line
          await this.parsedModifiedContent(folderName, exercise_name, allJsonData);
        }
      }
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async addSingleExercise(courseFolderName, data) {
    try {
      if (fs.existsSync(`${courseFolderName}`)) {
        fs.writeFileSync(
          path.resolve(`${courseFolderName}/${data.name}.json`),
          JSON.stringify(JSON.parse(data.content), null, '\t')
        );
      }
      await this.parsedModifiedContent(courseFolderName, data.name, data.content);
      return [null, JSON.stringify(JSON.parse(data.content), null, '\t')];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateCourseVersion(course_name, version) {
    const { CourseVersions } = this.server.models();
    try {
      const updated = await CourseVersions.query()
        .patch({ version })
        .where('course_name', course_name);
      return [null, updated];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
