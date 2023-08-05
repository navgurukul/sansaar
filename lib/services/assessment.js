const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const Strapi = require('strapi-sdk-js');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});
module.exports = class AssessmentService extends Schmervice.Service {
 

  // eslint-disable-next-line class-methods-use-this
  async getAssessmentById(assessment_id) {
    try {
      const { data } = await strapi.findOne('assessments', assessment_id);
      const assessment = data.attributes.content;
      return [null, assessment];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async findAssessmentByCourseDetails(
    exerciseDetail,
    courseId,
    courseName,
    sequence,
    userDetails,
    lang = 'en'
  ) {
    const { data } = await strapi.findOne('exercises', exerciseDetail.id, {
      populate: ['assessment'],
      pagination: {
        start: 0,
        limit: -1,
      },
    });
    const asses = await data.attributes.assessment.data.map((ele) => {
      return {
        id: ele.id,
        course_id: courseId,
        exercise_id: exerciseDetail.id,
        content: ele.attributes.content,
        description: ele.attributes.description,
        type: ele.attributes.type,
        sequence_num: ele.attributes.sequence_num,
        updated_at: ele.attributes.updatedAt,
      };
    });
    const AssessmentList = [];
    if (asses.length > 0) {
      // eslint-disable-next-line
      for (const file of asses) {
        const attempt_status = {};
        if (userDetails !== null) {
          // eslint-disable-next-line
          const [err, isAttempted] = await this.findResultById(file.id, userDetails.id);
          attempt_status.selected_option = isAttempted.selected_option;
          attempt_status.attempt_count = isAttempted.attempt_count;
        } else {
          attempt_status.selected_option = null;
          attempt_status.attempt_count = 0;
        }
        const newExercise = {};
        newExercise.id = file.id;
        newExercise.course_id = exerciseDetail.course_id;
        newExercise.exercise_id = exerciseDetail.id;
        newExercise.course_name = courseName;
        newExercise.exercise_name = exerciseDetail.name;
        newExercise.content = file.content;
        newExercise.attempt_status = attempt_status;
        newExercise.sequence_num = sequence;
        newExercise.content_type = 'assessment';
        newExercise.updated_at = file.updated_at;
        AssessmentList.push(newExercise);
        sequence += 1;
      }
    }
    return AssessmentList;
  }

  // eslint-disable-next-line
  async getExerciseAssessment(baseDir, fileName, lang = 'en') {
    const modifiedFile = `${baseDir}/MODIFIED_FILES/${fileName}.json`;
    const propertiesFile = `${baseDir}/PROPERTIES_FILES/${fileName}_${lang}.json`;
    if (fs.existsSync(modifiedFile)) {
      const modifiedDataInString = JSON.parse(fs.readFileSync(modifiedFile));
      if (!fs.existsSync(propertiesFile)) {
        return modifiedDataInString;
      }
      const propertiesDataInString = JSON.parse(fs.readFileSync(propertiesFile));
      _.map(modifiedDataInString, async (modifiedCont) => {
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
          _.forEach(modifiedCont.value, (innerList) => {
            // eslint-disable-next-line
            if (propertiesDataInString.hasOwnProperty(innerList.value)) {
              innerList.value = propertiesDataInString[innerList.value];
            }
          });
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
    return null;
  }

  async studentResult(details, txn) {
    const { assessmentOutcome } = this.server.models();
    const { coursesServiceV2, progressTrackingService } = this.server.services();
    try {
      const assessment = await assessmentOutcome
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere('user_id', details.user_id);
      if (assessment.length > 0 && assessment != null) {
        details.attempt_count = assessment[0].attempt_count + 1;
        await assessmentOutcome
          .query(txn)
          .patch(details)
          .where('assessment_id', details.assessment_id)
          .andWhere('user_id', details.user_id);
      } else {
        details.attempt_count = 1;
        await assessmentOutcome.query(txn).insert(details);
      }
      let result = await assessmentOutcome
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere('user_id', details.user_id);
      if (result.length > 0 && result != null) {
        // eslint-disable-next-line
        result = result[0];
        const jsonDetails = {};
        const { data } = await strapi.findOne('assessments', details.assessment_id, {
          populate: ['course'],
        });
        const [errInPathwayId, getPathwayId] = await coursesServiceV2.getPathwayIdByCourseId(
          data.attributes.course.data.id
        );
        jsonDetails.user_id = details.user_id;
        jsonDetails.assessment_id = details.assessment_id;
        jsonDetails.course_id = data.attributes.course.data.id;
        jsonDetails.pathway_id = getPathwayId;
        jsonDetails.exercise_id = null;
        await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
      }
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findResultById(assessment_id, user_id) {
    const { assessmentOutcome } = this.server.models();
    const result = {};
    try {
      const assessment = await assessmentOutcome
        .query()
        .where('assessment_id', assessment_id)
        .andWhere('user_id', user_id);
      if (assessment.length > 0 && assessment != null) {
        if (assessment[0].status === 'Pass') {
          result.attempt_status = 'CORRECT';
        } else {
          result.attempt_status = 'INCORRECT';
        }
        result.attempt_count = assessment[0].attempt_count;
        result.selected_option = assessment[0].selected_option;
        result.assessment_id = assessment_id;
      } else {
        result.attempt_status = 'NOT_ATTEMPTED';
        result.selected_option = null;
        result.attempt_count = 0;
        result.assessment_id = assessment_id;
      }
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  
};
