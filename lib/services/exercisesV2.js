const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const globals = require('node-global-storage');
const { Translate } = require('@google-cloud/translate').v2;
const CONFIG = require('../config/index');
const logger = require('../../server/logger');

const CREDENTIALS = JSON.parse(CONFIG.auth.translation.googleTranslation);

const { errorHandler } = require('../errorHandling');

const translate = new Translate({
  credentials: CREDENTIALS,
  projectId: CREDENTIALS.project_id,
});

module.exports = class ExercisesServiceV2 extends Schmervice.Service {
  // eslint-disable-next-line
  async googleTranslate(text, target) {
    try {
      const [translation] = await translate.translate(text, target);
      return translation;
    } catch (error) {
      return error;
    }
  }

  async getExerciseByName(name) {
    const { ExercisesV2 } = this.server.models();
    let exercise;
    try {
      exercise = await ExercisesV2.query().where('name', name);
      return [null, exercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getExerciseById(id) {
    const { ExercisesV2 } = this.server.models();
    let exercise;
    try {
      exercise = await ExercisesV2.query().where('id', id);
      return [null, exercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async addExercises(data) {
    const { ExercisesV2, CoursesV2 } = this.server.models();
    try {
      const courseDetails = await CoursesV2.query().findById(data.course_id);
      if (courseDetails !== undefined) {
        const courseFolderName = `curriculum_new/${courseDetails.name}_${data.course_id}`;
        if (fs.existsSync(`${courseFolderName}`)) {
          fs.writeFileSync(
            path.resolve(`${courseFolderName}/${data.name}.json`),
            JSON.stringify(JSON.parse(data.content), null, '\t')
          );
        }
        const exerciseContant = await this.parsedModifiedContent(
          courseFolderName,
          data.name,
          data.content,
          'curriculum_new'
        );
        data.content = exerciseContant;
        const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${courseDetails.name}_${data.course_id}_${data.name}`;
        await this.doTranslate(propertiesFilePath);
      }
      // const exercisesV2Details = await ExercisesV2.query().where('name', data.name);
      // let newExercise;
      // if (
      //   exercisesV2Details.length > 0 &&
      //   exercisesV2Details !== undefined &&
      //   exercisesV2Details !== null
      // ) {
      //   newExercise = await ExercisesV2.query().patch(data).where('id', exercisesV2Details[0].id);
      // } else {
      //   newExercise = await ExercisesV2.query().insert(data);
      // }
      const newExercise = await ExercisesV2.query().insert(data);
      return [null, newExercise];
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
    const contentByParts = [];
    let contentKeys = '';
    let allJSONKeys;
    let beginKeyOn = 0;
    const parsedDataInString = JSON.parse(exerciseContent);
    _.map(parsedDataInString, (img) => {
      if (img.component === 'image') {
        if (!img.value.startsWith('http')) {
          const imagePath = `${courseFolderName}/${img.value}`;
          const awsS3Path = `https://${
            CONFIG.auth.aws.s3Bucket
          }.s3.ap-south-1.amazonaws.com/course_images_v2/${imagePath.split(`${basePath}/`)[1]}`;
          img.value = awsS3Path;
        }
      }
      if (img.component === 'table') {
        // eslint-disable-next-line no-restricted-syntax
        for (const head in img.value) {
          if (img.value[head].header.includes('Image')) {
            // eslint-disable-next-line no-restricted-syntax, guard-for-in
            for (const src in img.value[head].items) {
              // eslint-disable-next-line no-console
              const a = img.value[head].items[src];
              const actualSrc = a.split('src="')[1].split('" alt=')[0];
              const awsS3Path = `https://${
                CONFIG.auth.aws.s3Bucket
              }.s3.ap-south-1.amazonaws.com/course_images_v2/${
                courseFolderName.split(`/`)[1]
              }/${actualSrc}`;
              img.value[head].items[src] = a.replace(actualSrc, awsS3Path);
            }
          }
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
    return allContentByParts;
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
        jsonData.component !== 'questionCode' &&
        jsonData.component !== 'table' &&
        jsonData.component !== 'youtube' &&
        jsonData.component !== 'image' &&
        jsonData.component !== 'banner' &&
        jsonData.component !== 'solution' &&
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
        _.forEach(jsonData.value, (innerList) => {
          let modifiedContent = '';
          keyNumber += 1;
          keyProp = `${exerciseName}_key${keyNumber}`;
          modifiedContent += `${keyProp}`;
          keyPropMapping[keyProp] = `${innerList.value}`;
          innerList.value = modifiedContent;
        });
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
    const partPath = courseFolderName.split(`${basePath}/`)[1];
    if (basePath === 'assessment') {
      fs.writeFileSync(
        path.resolve(`${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${exerciseFileName}.json`),
        contentKeys
      );
      fs.writeFileSync(
        path.resolve(
          `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${exerciseFileName}_en.json`
        ),
        JSON.stringify(allJSONKeys, null, '\t')
      );
    } else {
      fs.writeFileSync(
        path.resolve(
          `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseFileName}.json`
        ),
        contentKeys
      );
      fs.writeFileSync(
        path.resolve(
          `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseFileName}_en.json`
        ),
        JSON.stringify(allJSONKeys, null, '\t')
      );
    }
  }

  async updateSingleExercises(exerciseId, data) {
    const { ExercisesV2, CoursesV2 } = this.server.models();
    let exerciseContant;
    try {
      if (data.name !== undefined || data.content !== undefined) {
        const exerciseDetails = await ExercisesV2.query().findById(exerciseId);
        const courseDetails = await CoursesV2.query().findById(exerciseDetails.course_id);
        const language = ['hi', 'en', 'te', 'mr', 'ta'];
        if (courseDetails !== undefined) {
          const courseFolderName = `curriculum_new/${courseDetails.name}_${courseDetails.id}`;
          const partPath = courseFolderName.split('curriculum_new/')[1];
          if (data.name !== undefined) {
            if (fs.existsSync(`${courseFolderName}`)) {
              const courseData = fs.readFileSync(
                `${courseFolderName}/${exerciseDetails.name}.json`
              );
              const allJsonData = courseData.toString().trim();
              fs.renameSync(
                `${courseFolderName}/${exerciseDetails.name}.json`,
                `${courseFolderName}/${data.name}.json`
              );
              fs.renameSync(
                `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseDetails.name}.json`,
                `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${data.name}.json`
              );
              // eslint-disable-next-line
              for (const lang in language) {
                if (
                  fs.existsSync(
                    `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}_${language[lang]}.json`
                  )
                ) {
                  fs.renameSync(
                    `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}_${language[lang]}.json`,
                    `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${data.name}_${language[lang]}.json`
                  );
                }
              }
              exerciseDetails.name = data.name;
              if (data.content === undefined) {
                exerciseContant = await this.parsedModifiedContent(
                  courseFolderName,
                  data.name,
                  allJsonData
                );
                const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${data.name}`;
                await this.doTranslate(propertiesFilePath);
              }
            }
          }
          if (data.content !== undefined) {
            if (fs.existsSync(`${courseFolderName}`)) {
              fs.writeFileSync(
                path.resolve(`${courseFolderName}/${exerciseDetails.name}.json`),
                JSON.stringify(JSON.parse(data.content), null, '\t')
              );
            }
            exerciseContant = await this.parsedModifiedContent(
              courseFolderName,
              exerciseDetails.name,
              data.content
            );
            data.content = exerciseContant;
            const propertiesFilePath = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}`;
            await this.doTranslate(propertiesFilePath);
          }
        }
      }
      const updated = await ExercisesV2.query().patch(data).where('id', exerciseId);
      return [null, updated];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async markExerciseComplete(userId, exerciseId) {
    const { ExerciseCompletionV2 } = this.server.models();
    const completedExercise = { user_id: userId, exercise_id: exerciseId };
    try {
      await ExerciseCompletionV2.query()
        .context({ user_id: userId, exercise_id: exerciseId })
        .insert(completedExercise);
      return [null, { success: true }];
    } catch (err) {
      const errorObj = errorHandler(err);
      if (errorObj.type === 'UniqueViolationError')
        errorObj.message = 'Exercise might have already been marked completed';
      return [errorObj, null];
    }
  }

  async getIdForRemoval(userId, exerciseId) {
    const { ExerciseCompletionV2 } = this.server.models();
    const exercise = await ExerciseCompletionV2.query().where({
      user_id: userId,
      exercise_id: exerciseId,
    });
    if (exercise.length > 0) {
      return exercise;
    }
    throw Boom.badRequest('Exercise might have already been marked incomplete');
  }

  async removeExerciseComplete(id, userId, exerciseId) {
    const { ExerciseCompletionV2 } = this.server.models();

    const exerciseCompletion = await ExerciseCompletionV2.fromJson({
      id,
      user_id: userId,
      exercise_id: exerciseId,
    });
    const success = await exerciseCompletion
      .$query()
      .context({ user_id: userId, exercise_id: exerciseId })
      .delete();
    if (success) return { success: true };
    throw Boom.badRequest('Exercise might have already been marked incomplete');
  }

  async getExerciseComplete(userId) {
    const { ExerciseCompletionV2 } = this.server.models();

    let completedExercise;
    try {
      completedExercise = await ExerciseCompletionV2.query()
        .throwIfNotFound()
        .where('user_id', userId);
      return [null, completedExercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async deleteExerciseById(id) {
    const {
      ExercisesV2,
      CoursesV2,
      Assessment,
      assessmentResult,
      PathwaysOngoingTopic,
      LearningTrackStatus,
    } = this.server.models();
    let deleted;
    try {
      const exerciseDetails = await ExercisesV2.query().findById(id);
      const assessmentDetails = await Assessment.query().where('exercise_id', id);
      const courseDetails = await CoursesV2.query().findById(exerciseDetails.course_id);
      const currentAssessmentFolderName = `assessment/${courseDetails.name}_${courseDetails.id}/${exerciseDetails.name}`;
      if (fs.existsSync(`${currentAssessmentFolderName}`)) {
        fs.removeSync(currentAssessmentFolderName);
      }
      // eslint-disable-next-line
      for (const data of assessmentDetails) {
        // eslint-disable-next-line
        await assessmentResult.query().delete().where('assessment_id', data.id);
        // eslint-disable-next-line
        await PathwaysOngoingTopic.query().delete().where('assessment_id', data.id);
        // eslint-disable-next-line
        await Assessment.query().delete().where('id', data.id);
      }
      await PathwaysOngoingTopic.query().delete().where('exercise_id', id);
      await LearningTrackStatus.query().delete().where('exercise_id', id);
      deleted = await ExercisesV2.query().delete().throwIfNotFound().where('id', id);
      let successfullyDeleted;
      if (deleted) {
        successfullyDeleted = { success: true };
      }
      const language = ['hi', 'en', 'te', 'mr', 'ta'];
      if (courseDetails !== undefined) {
        const courseFolderName = `curriculum_new/${courseDetails.name}_${courseDetails.id}`;
        const partPath = courseFolderName.split('curriculum_new/')[1];
        if (
          fs.existsSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseDetails.name}_en.json`
          )
        ) {
          fs.unlinkSync(
            `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseDetails.name}_en.json`
          );
        }
        // eslint-disable-next-line
        for (const lang in language) {
          if (
            fs.existsSync(
              `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}_${language[lang]}.json`
            )
          ) {
            fs.unlinkSync(
              `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${partPath}_${exerciseDetails.name}_${language[lang]}.json`
            );
          }
        }
        if (fs.existsSync(`${courseFolderName}/${exerciseDetails.name}.json`)) {
          fs.unlinkSync(`${courseFolderName}/${exerciseDetails.name}.json`);
        }
      }
      return [null, successfullyDeleted];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async doTranslate(folderPath) {
    const hindiContent = globals.get('hi');
    const teContent = globals.get('te');
    const mrContent = globals.get('mr');
    const taContent = globals.get('ta');
    const language = { hi: hindiContent, te: teContent, mr: mrContent, ta: taContent };
    try {
      if (fs.existsSync(`${folderPath}_en.json`)) {
        const content = fs.readFileSync(`${folderPath}_en.json`);
        const parsedContent = JSON.parse(content.toString().trim());
        // eslint-disable-next-line
        for (const lang in language) {
          const keyPropMapping = {};
          // eslint-disable-next-line
          for (const jsonContent in parsedContent) {
            if (language[lang][0][parsedContent[jsonContent]] !== undefined) {
              keyPropMapping[jsonContent] = `${language[lang][0][parsedContent[jsonContent]]}`;
            } else {
              // eslint-disable-next-line
              const translatedData = await this.googleTranslate(parsedContent[jsonContent], lang);
              keyPropMapping[jsonContent] = translatedData;
            }
          }
          fs.writeFileSync(
            path.resolve(`${folderPath}_${lang}.json`),
            JSON.stringify(keyPropMapping, null, '\t')
          );
        }
      }
      return [null, 'courseName'];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async getExerciseByCourseId(id, lang = 'en') {
    const { ExercisesV2, CoursesV2 } = this.server.models();
    let exercisesDetails;
    try {
      exercisesDetails = await ExercisesV2.query().where('id', id);
      if (exercisesDetails) {
        const courseDetails = await CoursesV2.query().findById(exercisesDetails[0].course_id);
        const baseDir = `curriculum_new/${courseDetails.name}_${courseDetails.id}/PARSED_CONTENT`;
        const exNameForModifiedFile = `${courseDetails.name}_${courseDetails.id}_${exercisesDetails[0].name}.json`;
        const exNameLang = `${courseDetails.name}_${courseDetails.id}_${exercisesDetails[0].name}_${lang}.json`;
        const modifiedFile = `${baseDir}/MODIFIED_FILES/${exNameForModifiedFile}`;
        const propertiesFile = `${baseDir}/PROPERTIES_FILES/${exNameLang}`;
        if (fs.existsSync(modifiedFile) && fs.existsSync(propertiesFile)) {
          const modifiedDataInString = JSON.parse(fs.readFileSync(modifiedFile));
          const propertiesDataInString = JSON.parse(fs.readFileSync(propertiesFile));
          _.map(modifiedDataInString, (modifiedCont) => {
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
          });
          exercisesDetails[0].content = modifiedDataInString;
        } else {
          const parseContent = JSON.parse(JSON.parse(exercisesDetails[0].content));
          exercisesDetails[0].content = parseContent.value;
        }
      }
      return [null, exercisesDetails];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async insertLearningTrackData() {
    const { ExerciseCompletionV2, LearningTrackStatus } = this.server.models()
    try {
      const lrningTrkData = await LearningTrackStatus.query().select('user_id', 'exercise_id');
      for (let ind = 0; ind < lrningTrkData.length; ind++) {
        // console.log(lrningTrkData[ind].user_id);
        // console.log(lrningTrkData[ind].exercise_id);
        const insrt = await this.markExerciseComplete(lrningTrkData[ind].user_id, lrningTrkData[ind].exercise_id)
        console.log(insrt, '2222')
      }
      return [null, lrningTrkData]
    } catch (error) {
      return [errorHandler(error), null]
    }
  }
};
