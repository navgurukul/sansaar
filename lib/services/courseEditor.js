const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { transaction, val } = require('objection');
const globals = require('node-global-storage');
const logger = require('../../server/logger');
const CONFIG = require('../config/index');
const { errorHandler } = require('../errorHandling');
const { UTCToISTConverter } = require('../helpers/index');

module.exports = class CourseEditorService extends Schmervice.Service {
  async createCourses() {
    const { coursesServiceV2 } = this.server.services();
    const { CourseProductionVersions } = this.server.models();

    try {
      if (!fs.existsSync(`curriculum_v2`)) {
        fs.mkdirSync(`curriculum_v2`);
      }
      const courses = fs.readdirSync('curriculum_new');
      for (const course of courses) {
        fs.copySync(`curriculum_new/${course}`, `curriculum_v2/${course}/v1`);
        const courseId = course.split('_');
        const [errorWhileFetchingDetails, coursesDetails] = await coursesServiceV2.getCourseById(
          courseId[courseId.length - 1]
        );
        if (coursesDetails !== null && coursesDetails !== undefined) {
          for (const lang of coursesDetails.lang_available) {
            const alreadyInsertedData = await CourseProductionVersions.query()
              .where('course_id', coursesDetails.id)
              .andWhere('lang', lang)
              .andWhere('version', 'v1');
            if (alreadyInsertedData.length <= 0) {
              const data = {};
              data.course_id = coursesDetails.id;
              data.lang = lang;
              data.version = 'v1';
              // eslint-disable-next-line
              await CourseProductionVersions.query().insert(data);
            }
          }
        }
      }
      return [null, 'courses'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findDetailInCourseVersionsById(course_id, lang = 'en') {
    const { CourseProductionVersions } = this.server.models();
    try {
      const course_version = await CourseProductionVersions.query()
        .where('course_id', course_id)
        .andWhere('lang', lang);
      return [null, course_version];
    } catch (err) {
      const error = errorHandler(err);
      return [error, null];
    }
  }

  async updateCourseVersion(course_id, version) {
    const { CourseProductionVersions } = this.server.models();
    try {
      const updated = await CourseProductionVersions.query()
        .patch({ version })
        .where('course_id', course_id);
      return [null, updated];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

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
    const { exercisesServiceV2 } = this.server.services();
    if (!fs.existsSync(`${courseFolderName}/${exerciseName}.json`)) {
      return [null, 'notUpdated'];
    }
    try {
      if (data.name !== undefined) {
        let partPath = courseFolderName.split('curriculum_v2/')[1];
        partPath = partPath.split('/');
        if (fs.existsSync(`${courseFolderName}`)) {
          const courseData = fs.readFileSync(`${courseFolderName}/${exerciseName}.json`);
          const allJsonData = courseData.toString().trim();
          const language = ['hi', 'en', 'te', 'mr', 'ta'];
          fs.renameSync(
            `${courseFolderName}/${exerciseName}.json`,
            `${courseFolderName}/${data.name}.json`
          );
          fs.renameSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${exerciseName}.json`,
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${data.name}.json`
          );
          // eslint-disable-next-line
          for (const lang in language) {
            if (
              fs.existsSync(
                `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${exerciseName}_${language[lang]}.json`
              )
            ) {
              fs.renameSync(
                `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${exerciseName}_${language[lang]}.json`,
                `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${data.name}_${language[lang]}.json`
              );
            }
          }
          // eslint-disable-next-line
          exerciseName = data.name;
          await this.parsedModifiedContent(courseFolderName, data.name, allJsonData);
          if (data.content === undefined) {
            const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${data.name}`;
            await exercisesServiceV2.doTranslate(propertiesFilePath);
          }
        }
      }
      if (data.content !== undefined) {
        if (fs.existsSync(`${courseFolderName}`)) {
          fs.writeFileSync(
            path.resolve(`${courseFolderName}/${exerciseName}.json`),
            JSON.stringify(JSON.parse(data.content), null, '\t')
          );
        }
        await this.parsedModifiedContent(courseFolderName, exerciseName, data.content);
        let partPath = courseFolderName.split('curriculum_v2/')[1];
        partPath = partPath.split('/');
        const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${exerciseName}`;
        await exercisesServiceV2.doTranslate(propertiesFilePath);
      }
      return [null, 'updated'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async copyFolder(folderName, courseName, version, newVersion) {
    try {
      let result = false;
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName);
        result = true;
      }
      if (result) {
        fs.copySync(`curriculum_v2/${courseName}/${version}`, folderName);
      }
      fs.readdirSync(`${folderName}/PARSED_CONTENT/PROPERTIES_FILES`).forEach((file) => {
        fs.renameSync(
          `${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${file}`,
          `${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${file.replace(version, newVersion)}`
        );
      });
      fs.readdirSync(`${folderName}/PARSED_CONTENT/MODIFIED_FILES`).forEach((file) => {
        fs.renameSync(
          `${folderName}/PARSED_CONTENT/MODIFIED_FILES/${file}`,
          `${folderName}/PARSED_CONTENT/MODIFIED_FILES/${file.replace(version, newVersion)}`
        );
      });
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async parsedModifiedContent(
    courseFolderName,
    exerciseName,
    exerciseContent,
    basePath = 'curriculum_v2'
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
            }.s3.ap-south-1.amazonaws.com/course_images/${imagePath.split(`curriculum_v2/`)[1]}`;
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

  async createParsedContent(
    courseFolderName,
    exerciseFileName,
    contentKeys,
    allJSONKeys,
    basePath = 'curriculum_v2'
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
        `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath[0]}_${exerciseFileName}.json`
      ),
      contentKeys
    );
    fs.writeFileSync(
      path.resolve(
        `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath[0]}_${exerciseFileName}_en.json`
      ),
      JSON.stringify(allJSONKeys, null, '\t')
    );
  }

  async courseEditorStatus(details) {
    const { CourseEditorStatus } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    try {
      let data;
      details.stateChangedate = dateIST;
      const editorStatus = await CourseEditorStatus.query().where('course_id', details.course_id);
      if (editorStatus !== null && editorStatus !== undefined && editorStatus.length > 0) {
        data = await CourseEditorStatus.query()
          .patch(details)
          .where('course_id', details.course_id);
      } else {
        data = await CourseEditorStatus.query().insert(details);
      }
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getCourseEditorDetail(course_id) {
    const { CourseEditorStatus } = this.server.models();
    try {
      const data = await CourseEditorStatus.query().where('course_id', course_id);
      return [null, data];
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

  async getCourseExercise(course_id, version, lang = 'en', txn) {
    const { CoursesV2 } = this.server.models();
    let courseExercises;
    try {
      courseExercises = await CoursesV2.query()
        .where('courses_v2.id', course_id)
        .throwIfNotFound()
        .withGraphJoined('exercisesV2')
        .modify((builder) => {
          builder.orderBy('exercisesV2.sequence_num');
        });
      _.map(courseExercises[0].exercisesV2, (exercise) => {
        const baseDir = `curriculum_v2/${courseExercises[0].name}_${courseExercises[0].id}/${version}/PARSED_CONTENT`;
        const courseNameForModifiedFile = `${courseExercises[0].name}_${courseExercises[0].id}_${exercise.name}.json`;
        const courseName = `${courseExercises[0].name}_${courseExercises[0].id}_${exercise.name}_${lang}.json`;
        const modifiedFile = `${baseDir}/MODIFIED_FILES/${courseNameForModifiedFile}`;
        const propertiesFile = `${baseDir}/PROPERTIES_FILES/${courseName}`;
        if (fs.existsSync(modifiedFile) && fs.existsSync(propertiesFile)) {
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
            } else if (modifiedCont.component === 'banner') {
              modifiedCont.actions[0].variant = 'primary';
            } else {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(modifiedCont.value)) {
                modifiedCont.value = propertiesDataInString[modifiedCont.value]
                  .split(
                    '<span style="color: #eb9371; background-color: rgba(39, 41, 43, 0.83); box-shadow: 2px 2px 2px rgba(22, 9, 1, 0.6); border-radius: 2px; padding: 2px">'
                  )
                  .join(
                    '<span style="background-color: rgba(233, 245, 233, 0.83); border-radius: 2px; padding: 2px">'
                  );
              }
            }
          });
          exercise.content = modifiedDataInString;
        } else {
          const parseContent = JSON.parse(JSON.parse(exercise.content));
          exercise.content = parseContent.value;
        }
      });
      return [null, courseExercises];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createNewCourseEditor(details, txn) {
    const { CoursesV2 } = this.server.models();
    if (details.lang_available) {
      details.lang_available = val(details.lang_available).asArray().castTo('text[]');
    }
    const createCourse = await CoursesV2.query(txn).insert(details);
    const courseFolderName = `${details.name}_${createCourse.id}`;
    if (!fs.existsSync(`curriculum_v2/${courseFolderName}`)) {
      fs.mkdirSync(`curriculum_v2/${courseFolderName}`);
    }
    return createCourse;
  }

  async deleteCourseById(courseId) {
    const {
      CoursesV2,
      CourseCompletionV2,
      ExercisesV2,
      LearningTrackStatus,
      PathwaysOngoingTopic,
      PathwayCoursesV2,
      CourseProductionVersions,
    } = this.server.models();
    try {
      const availableCourses = await CoursesV2.query().findById(courseId);
      const deleteCourse = await transaction(
        CourseCompletionV2,
        ExercisesV2,
        CoursesV2,
        LearningTrackStatus,
        PathwaysOngoingTopic,
        PathwayCoursesV2,
        CourseProductionVersions,
        async (
          CourseCompletionV2Model,
          ExerciseModel,
          CourseModel,
          LearningTrackModel,
          PathwaysOngoingModel,
          PathwayCoursesModel,
          CourseProductionModel,
        ) => {
          try {
            if (availableCourses !== undefined) {
              const currentFolderName = `curriculum_v2/${availableCourses.name}_${courseId}`;
              if (fs.existsSync(`${currentFolderName}`)) {
                fs.removeSync(currentFolderName);
              }
            }
            await CourseCompletionV2Model.query().delete().where('course_id', courseId);
            await PathwayCoursesModel.query().delete().where('course_id', courseId);
            await LearningTrackModel.query().delete().where('course_id', courseId);
            await PathwaysOngoingModel.query().delete().where('course_id', courseId);
            await ExerciseModel.query().delete().where('course_id', courseId);
            await CourseProductionModel.query().delete().where('course_id', courseId);
            await CourseModel.query().throwIfNotFound().deleteById(courseId);
            return { success: true };
          } catch (err) {
            return errorHandler(err);
          }
        }
      );
      return [null, deleteCourse];
    } catch (err) {
      return [err, null];
    }
  }
};
