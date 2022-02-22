const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');

module.exports = class AssessmentService extends Schmervice.Service {
  async addAssessment(data) {
    const { ExercisesV2, CoursesV2, Assessment } = this.server.models();
    const { exercisesServiceV2 } = this.server.services();
    try {
      let newExercise;
      const courseDetails = await CoursesV2.query().findById(data.course_id);
      const exercise = await ExercisesV2.query().findById(data.exercise_id);
      if (courseDetails !== undefined) {
        const courseFolderName = `assessment/${courseDetails.name}_${data.course_id}`;
        if (!fs.existsSync(`${courseFolderName}`)) {
          fs.mkdirSync(`${courseFolderName}`);
          if (!fs.existsSync(`${courseFolderName}/${exercise.name}`)) {
            fs.mkdirSync(`${courseFolderName}/${exercise.name}`);
          }
        } else if (!fs.existsSync(`${courseFolderName}/${exercise.name}`)) {
          fs.mkdirSync(`${courseFolderName}/${exercise.name}`);
        }
        if (fs.existsSync(`${courseFolderName}/${exercise.name}`)) {
          fs.writeFileSync(
            path.resolve(`${courseFolderName}/${exercise.name}/${exercise.name}_${data.name}.json`),
            JSON.stringify(JSON.parse(data.content), null, '\t')
          );
        }
        const exerciseContant = await exercisesServiceV2.parsedModifiedContent(
          `${courseFolderName}/${exercise.name}`,
          `${exercise.name}_${data.name}`,
          data.content,
          'assessment'
        );
        data.name = `${exercise.name}_${data.name}`;
        data.content = exerciseContant;
        newExercise = await Assessment.query().insert(data);
      }
      return [null, newExercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findAssessmentByCourseDetails(exerciseDetail, courseId, courseName, sequence, lang = 'en') {
    const { Assessment } = this.server.models();
    const exerciseAssessment = await Assessment.query().where('exercise_id', exerciseDetail.id);
    const currentFolderName = `assessment/${courseName}_${courseId}/${exerciseDetail.name}/PARSED_CONTENT`;
    const AssessmentList = [];
    if (exerciseAssessment.length > 0) {
      // eslint-disable-next-line
      for (const file of exerciseAssessment) {
        // eslint-disable-next-line
        const data = await this.getExerciseAssessment(currentFolderName, file.name, lang);
        const newExercise = {};
        newExercise.id = file.id;
        newExercise.course_id = exerciseDetail.course_id;
        newExercise.exercise_id = exerciseDetail.id;
        newExercise.course_name = courseName;
        newExercise.exercise_name = exerciseDetail.name;
        newExercise.content = data;
        newExercise.sequence_num = sequence;
        newExercise.content_type = 'assessment';
        AssessmentList.push(newExercise);
        sequence += 1;
      }
    }
    return AssessmentList;
  }

  // eslint-disable-next-line
  async getExerciseAssessment(baseDir, fileName, lang = 'en', txn) {
    const modifiedFile = `${baseDir}/MODIFIED_FILES/${fileName}.json`;
    const propertiesFile = `${baseDir}/PROPERTIES_FILES/${fileName}_${lang}.json`;
    if (fs.existsSync(modifiedFile)) {
      const modifiedDataInString = JSON.parse(fs.readFileSync(modifiedFile));
      if (!fs.existsSync(propertiesFile)) {
        return modifiedDataInString;
      }
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
      return modifiedDataInString;
    }
  }

  async studentResult(details, txn) {
    const { assessmentResult } = this.server.models();
    let result;
    try {
      const assessment = await assessmentResult
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere('user_id', details.user_id);
      if (assessment.length > 0 && assessment != null) {
        result = await assessmentResult
          .query(txn)
          .patch(details)
          .where('assessment_id', details.assessment_id)
          .andWhere('user_id', details.user_id);
      } else {
        result = await assessmentResult.query(txn).insert(details);
      }
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
