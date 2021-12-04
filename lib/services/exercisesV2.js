const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const { errorHandler } = require('../errorHandling');

module.exports = class ExercisesServiceV2 extends Schmervice.Service {
  async addExercises(data) {
    const { ExercisesV2, CoursesV2 } = this.server.models();
    try {
      const courseDetails = await CoursesV2.query().findById(data.course_id);
      const fileName = data.name.replace(' ', '_');
      if (courseDetails !== undefined) {
        const folderName=courseDetails.name.replace(' ', '_')
        const courseFolderName = `curriculum/${folderName}_${data.course_id}`;
        if (fs.existsSync(`curriculum/${courseFolderName}`)) {
          fs.writeFileSync(
            path.resolve(`${courseFolderName}/${fileName}.json`),
            JSON.stringify(JSON.parse(data.content), null, '\t')
          );
        }
        const contentByParts = [];
        let contentKeys = '';
        let allJSONKeys;
        let beginKeyOn = 0;
        const parsedDataInString = JSON.parse(data.content);
        _.map(parsedDataInString, (img) => {
          if (img.component === 'image') {
            if (!img.value.startsWith('http')) {
              const imagePath = `curriculum/${courseFolderName}/${img.value}`;
              this.allImages.push(imagePath);
              const awsS3Path = `https://${
                CONFIG.auth.aws.s3Bucket
              }.s3.ap-south-1.amazonaws.com/course_images/${imagePath.split('/curriculum/')[1]}`;
              img.value = awsS3Path;
            }
          }
        });
        const parsedContent = JSON.parse(
          await this.parseIntoModifiedContent(`${courseFolderName}/${fileName}`, parsedDataInString, beginKeyOn)
        );
        if (parsedContent.length > 0) {
          const { beginKeyFrom, jsonKeys, ...contents } = parsedContent[0];
          beginKeyOn = beginKeyFrom;
          contentKeys += JSON.stringify(contents.value, null, 2);
          allJSONKeys = { ...allJSONKeys, ...jsonKeys };
          contentByParts.push(JSON.stringify(contents));
        }
        this.createParsedContent(courseFolderName, fileName, contentKeys,allJSONKeys);
      }
      const newExercise = await ExercisesV2.query().insert(data);
      return [null, newExercise];
    } catch (err) {
      console.log("I am  here")
      console.log(err, 'err');
      return [errorHandler(err), null];
    }
  }

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
        jsonData.component !== 'banner'
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

  async createParsedContent(courseFolderName, exerciseFileName, contentKeys, allJSONKeys) {
    if (!fs.existsSync(`${courseFolderName}/PARSED_CONTENT`)) {
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT`);
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES`);
      fs.mkdirSync(`${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES`);
    }
    let partPath = courseFolderName.split('curriculum/')[1];
    partPath = partPath.split('/').slice(0, -1).join('/');
    // this.createDirsJson(partPath);

    fs.writeFileSync(
      path.resolve(
        `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${partPath}_${exerciseFileName}_en.json`
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

  async updateSingleExercises(exerciseId, data) {
    const { ExercisesV2 } = this.server.models();
    try {
      const updated = await ExercisesV2.query().patch(data).where('id', exerciseId);
      return [null, updated];
    } catch (err) {
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
};
