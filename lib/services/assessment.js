/* eslint-disable prettier/prettier */
/* eslint-disable class-methods-use-this */
const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const Strapi = require('strapi-sdk-js');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const { assessmentConverter, assessmentConverterV2 } = require('../helpers/strapiToMeraki/assessmentConverter');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});
module.exports = class AssessmentService extends Schmervice.Service {
  async findAssessmentByCourseDetails(
    exerciseDetail,
    courseId,
    courseName,
    sequence,
    userDetails,
    lang = 'en'
  ) {
    const { data } = await strapi.findOne('exercises', exerciseDetail.id, {
      populate: ['assessment', 'assessment.dynamic', 'assessment.explaination'],
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
        content: JSON.parse(assessmentConverter(ele.attributes)),
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
          const [err, isAttempted] = userDetails.team_id !== null && userDetails.team_id !== undefined
            ? await this.findResultById(file.id, userDetails.team_id)
            : await this.findResultById(file.id, userDetails.id);
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

  // for v2 API
  async findAssessmentByCourseDetailsV2(
    exerciseDetail,
    courseId,
    courseName,
    sequence,
    userDetails,
    lang = 'en'
  ) {
    const { data } = await strapi.findOne('exercises', exerciseDetail.id, {
      populate: ['assessment', 'assessment.dynamic', 'assessment.explaination'],
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
        content: JSON.parse(assessmentConverterV2(ele.attributes)),
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
          const [err, isAttempted] = await this.findMultipleResultById(file.id, userDetails.id);
          attempt_status.selected_multiple_option = isAttempted.selected_multiple_option;
          attempt_status.attempt_count = isAttempted.attempt_count;
        } else {
          attempt_status.selected_multiple_option = null;
          attempt_status.attempt_count = 0;
        }
        // Find the object in file.content where component is 'solution' and get its 'type'
        const solutionObject = file.content.find(item => item.component === 'solution');
        const newExercise = {};
        newExercise.id = file.id;
        newExercise.course_id = exerciseDetail.course_id;
        newExercise.exercise_id = exerciseDetail.id;
        newExercise.course_name = courseName;
        newExercise.exercise_name = exerciseDetail.name;
        newExercise.content = file.content;
        newExercise.attempt_status = attempt_status;
        newExercise.sequence_num = sequence;
        // Add the 'type' field to newExercise from the 'solution' object if found
        if (solutionObject && solutionObject.type) {
          newExercise.assessment_type = solutionObject.type;
        } else {
          newExercise.assessment_type = null; // Set a default value if not found
        }
        newExercise.max_selection_count = solutionObject.correct_options_value.length;
        newExercise.content_type = 'assessment';
        newExercise.updated_at = file.updated_at;
        AssessmentList.push(newExercise);
        sequence += 1;
      }

    }
    return AssessmentList;
  }

  async validateAnswerCurrectOrNot(assessment_id) {
    try {
      const { data } = await strapi.findOne('assessments', assessment_id, {
        populate: ['dynamic', 'explaination'],
      });
      const assessment = JSON.parse(assessmentConverterV2(data.attributes));
      let correct_array;
      let incorrect_array;
      let flag = false;
      for (let solu = 0; solu < assessment.length; solu++) {
        if (assessment[solu].component == 'solution') {
          if (assessment[solu].type === 'single') {
            flag = true;
          }
          correct_array = assessment[solu].correct_options_value.map(obj => obj.value);
          incorrect_array = assessment[solu].incorrect_options_value.map(obj => obj.value)
        }
      }
      return [correct_array, incorrect_array, flag];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async studentResult(details, txn) {
    const { assessmentOutcome } = this.server.models();
    const { coursesServiceV2, progressTrackingService, exercisesServiceV2 } = this.server.services();
    try {
      const user_team = details.team_id ?
        { 'team_id': details.team_id } : { 'user_id': details.user_id }
      const assessment = await assessmentOutcome
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere(user_team);

      let [correct_array, incorrect_array, flag] = await this.validateAnswerCurrectOrNot(details.assessment_id);
      
      if (correct_array.includes(details.selected_option)) {
        delete details.status;
        details.status = 'Pass';
      }
      else if (incorrect_array.includes(details.selected_option)) {
        delete details.status;
        details.status = 'Fail';
      }
      if (assessment.length > 0 && assessment != null) {
        details.attempt_count = assessment[0].attempt_count + 1;

        await assessmentOutcome
          .query(txn)
          .patch(details)
          .where('assessment_id', details.assessment_id)
          .andWhere(user_team);
      } else {
        details.attempt_count = 1;
        await assessmentOutcome.query(txn).insert(details);
      }
      let result = await assessmentOutcome
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere(user_team);
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

        const moduleCourseDetails = await strapi.findOne('courses', data.attributes.course.data.id, {
          populate: ['modules']
        });

        const modules = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.modules
        if (modules !== null && modules !== undefined && modules.data.length > 0) {
          details.module_id = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.modules && moduleCourseDetails.data.attributes.modules.data[0] && moduleCourseDetails.data.attributes.modules.data[0].id
        }

        jsonDetails.user_id = details.user_id ? details.user_id : null;
        jsonDetails.team_id = details.team_id ? details.team_id : null;
        jsonDetails.assessment_id = details.assessment_id;
        jsonDetails.module_id = details.module_id;
        jsonDetails.exercise_id = null;
        jsonDetails.project_topic_id = null;
        jsonDetails.project_solution_id = null;
        jsonDetails.course_id = data.attributes.course.data.id;
        jsonDetails.pathway_id = getPathwayId;
        await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);

        await exercisesServiceV2.calculateCourseModulePathwayPercent(details.user_id, data.attributes.course.data.id, details.team_id)
      }
      delete result.selected_multiple_option;
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findResultById(assessment_id, user_id, team_id) {
    const { assessmentOutcome } = this.server.models();
    const result = {};
    try {

      const assessment = user_id !== null && user_id !== undefined
        ? await assessmentOutcome
          .query().where('assessment_id', assessment_id)
          .andWhere('user_id', user_id)
        : await assessmentOutcome.query()
          .where('assessment_id', assessment_id)
          .andWhere('team_id', team_id);
      if (assessment.length > 0 && assessment != null) {
        if (assessment[0].status === 'Pass') {
          result.attempt_status = 'CORRECT';
        } else if (assessment[0].status === 'Partially_Correct') {
          result.attempt_status = 'CORRECT';
        } else if (assessment[0].status === 'Partially_Incorrect') {
          result.attempt_status = 'INCORRECT';
        } else {
          result.attempt_status = 'INCORRECT';
        }
        result.selected_option = assessment[0].selected_option;
        if (assessment[0].selected_multiple_option) {
          delete result.selected_option;
          const selected_multiple_option = JSON.parse(assessment[0].selected_multiple_option)[0];
          result.selected_option = selected_multiple_option;
        }
        result.attempt_count = assessment[0].attempt_count;
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


  async studentMultipleResult(details, txn) {
    const { assessmentOutcome } = this.server.models();
    const { coursesServiceV2, progressTrackingService, exercisesServiceV2 } = this.server.services();
    try {
      const user_team = details.team_id ?
        { 'team_id': details.team_id } : { 'user_id': details.user_id }

      if (details.selected_option && details.selected_multiple_option.length > 0) {
        return [null, { message: 'Please pass data into any one field, either selected_option or selected_multiple_option.' }];
      }
      const assessment = await assessmentOutcome
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere(user_team);

      let [correct_array, incorrect_array, flag] = await this.validateAnswerCurrectOrNot(
        details.assessment_id
      );
      let count = 0;
      let wrong = 0;
      for (let i = 0; i < details.selected_multiple_option.length; i++) {
        if (correct_array.includes(details.selected_multiple_option[i])) {
          count++;
        } else {
          if (incorrect_array.includes(details.selected_multiple_option[i])) {
            wrong++;
          }
        }
      }
      if (
        count < correct_array.length &&
        count > 0 &&
        details.selected_multiple_option.length < correct_array.length
      ) {
        delete details.status;
        details.status = 'Partially_Correct';
      }
      if (count == 0 && details.selected_multiple_option.length > 1) {
        delete details.status;
        details.status = 'Fail';
      }
      if ((wrong > 0) & (count > 0)) {
        delete details.status;
        details.status = 'Partially_Incorrect';
      }
      const arraysAreEqual =
        details.selected_multiple_option.length === correct_array.length &&
        details.selected_multiple_option.every((value, index) => value === correct_array[index]);
      if (arraysAreEqual) {
        if (details.status != 'Pass') {
          delete details.status;
          details.status = 'Pass';
        }
      } else {
        if (details.status === 'Pass') {
          delete details.status;
          details.status = 'Fail';
        }
      }
      if (assessment.length > 0 && assessment != null) {
        if (assessment[0].selected_option) {
          details.selected_option = null;
          const selected_multiple_option = JSON.stringify(details.selected_multiple_option);
          details.selected_multiple_option = selected_multiple_option;
          details.attempt_count = assessment[0].attempt_count + 1;
          await assessmentOutcome
            .query(txn)
            .patch(details)
            .where('assessment_id', details.assessment_id)
            .andWhere('user_id', details.user_id);
        } else {
          details.attempt_count = assessment[0].attempt_count + 1;
          let selected_multiple_option = JSON.stringify(details.selected_multiple_option);
          delete details.selected_multiple_option;
          details.selected_multiple_option = selected_multiple_option;
          await assessmentOutcome
            .query(txn)
            .patch(details)
            .where('assessment_id', details.assessment_id)
            .andWhere(user_team);
        }
      } else {
        details.attempt_count = 1;
        details.selected_option = null;
        let selected_multiple_option = JSON.stringify(details.selected_multiple_option);
        delete details.selected_multiple_option;
        details.selected_multiple_option = selected_multiple_option;
        await assessmentOutcome.query(txn).insert(details);
      }
      let result = await assessmentOutcome
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere(user_team);
      if (result.length > 0 && result != null) {
        result = result[0];
        let selected_multiple_option = JSON.parse(result.selected_multiple_option);
        result.selected_multiple_option = selected_multiple_option;
        const jsonDetails = {};
        const { data } = await strapi.findOne('assessments', details.assessment_id, {
          populate: ['course'],
        });
        const [errInPathwayId, getPathwayId] = await coursesServiceV2.getPathwayIdByCourseId(
          data.attributes.course.data.id
        );

        const moduleCourseDetails = await strapi.findOne('courses', data.attributes.course.data.id, {
          populate: ['modules']
        });

        const modules = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.modules
        if (modules !== null && modules !== undefined && modules.data.length > 0) {
          details.module_id = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.modules && moduleCourseDetails.data.attributes.modules.data[0] && moduleCourseDetails.data.attributes.modules.data[0].id
        }
        jsonDetails.user_id = details.user_id ? details.user_id : null;
        jsonDetails.team_id = details.team_id ? details.team_id : null;
        jsonDetails.assessment_id = details.assessment_id;
        jsonDetails.course_id = data.attributes.course.data.id;
        jsonDetails.pathway_id = getPathwayId;
        jsonDetails.module_id = details.module_id;
        jsonDetails.exercise_id = null;
        jsonDetails.project_topic_id = null;
        jsonDetails.project_solution_id = null;
        await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
        await exercisesServiceV2.calculateCourseModulePathwayPercent(details.user_id, data.attributes.course.data.id, details.team_id)
      }
      return [null, result];
    } catch (err) {
            return [errorHandler(err), null];
    }
  }

  async findMultipleResultById(assessment_id, user_id, team_id) {
    const { assessmentOutcome } = this.server.models();
    const result = {};
    try {
      const assessment = user_id !== null && user_id !== undefined
        ? await assessmentOutcome
          .query().where('assessment_id', assessment_id)
          .andWhere('user_id', user_id)
        : await assessmentOutcome.query()
          .where('assessment_id', assessment_id)
          .andWhere('team_id', team_id);
      if (assessment.length > 0 && assessment != null) {
        if (assessment[0].status === 'Pass') {
          result.attempt_status = 'CORRECT';
        } else {
          result['attempt_status'] = 'INCORRECT';
        }
        if (assessment[0].status === 'Partially_Correct') {
          result.attempt_status = 'PARTIALLY_CORRECT';
        } else if (assessment[0].status === 'Partially_Incorrect') {
          result.attempt_status = 'PARTIALLY_INCORRECT';
        }
        result.attempt_count = assessment[0].attempt_count;
        result.assessment_id = assessment_id;
        result.selected_multiple_option = [];
        if (assessment[0].selected_multiple_option && assessment[0].selected_option) {
          const selected_multiple_option6 = JSON.parse(assessment[0].selected_multiple_option);
          result.selected_multiple_option = selected_multiple_option6;
          if (!selected_multiple_option6.includes(assessment[0].selected_option)) {
            result.selected_multiple_option.push(assessment[0].selected_option);
          }
        }
        else if (assessment[0].selected_multiple_option) {
          const selected_multiple_option = JSON.parse(assessment[0].selected_multiple_option);
          result.selected_multiple_option = selected_multiple_option;
        }
        else if (assessment[0].selected_option) {
          result.selected_multiple_option.push(assessment[0].selected_option);
        }
      } else {
        result.attempt_status = 'NOT_ATTEMPTED';
        result.selected_multiple_option = null;
        result.attempt_count = 0;
        result.assessment_id = assessment_id;
      }
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};

