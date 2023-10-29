const Schmervice = require('schmervice');
const _ = require('lodash');
const Strapi = require('strapi-sdk-js');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});
const { errorHandler } = require('../errorHandling');

module.exports = class ProgressTrackingService extends Schmervice.Service {
  async createParameter(info, txn) {
    const { ProgressParameters } = this.server.models();
    let createdParameter;
    try {
      createdParameter = await ProgressParameters.query(txn).insert(info);
      return [null, createdParameter];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findParameters(txn) {
    const { ProgressParameters } = this.server.models();
    let parameter;
    try {
      parameter = await ProgressParameters.query(txn);
      return [null, parameter];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateParameter(id, info, txn) {
    const { ProgressParameters } = this.server.models();

    await ProgressParameters.query(txn).update(info).where({ id });
    return id;
  }

  async updateParameterAndFetch(id, info, txn) {
    const { ProgressParameters } = this.server.models();
    let updatedParameter;
    try {
      updatedParameter = await ProgressParameters.query(txn).updateAndFetchById(id, info);
      return [null, updatedParameter];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findParameterById(id, info, txn) {
    const { ProgressParameters } = this.server.models();
    let parameter;
    try {
      parameter = await ProgressParameters.query(txn).throwIfNotFound().findById(id);
      return [null, parameter];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createQuestion(info, txn) {
    const { ProgressQuestions } = this.server.models();
    let question;
    try {
      question = await ProgressQuestions.query(txn).insert(info);
      return [null, question];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findQuestions(txn) {
    const { ProgressQuestions } = this.server.models();
    let question;
    try {
      question = await ProgressQuestions.query(txn);
      return [null, question];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateQuestion(id, info, txn) {
    const { ProgressQuestions } = this.server.models();

    await ProgressQuestions.query(txn).update(info).where({ id });
    return id;
  }

  async updateQuestionAndFetch(id, info) {
    const { ProgressQuestions } = this.server.models();
    let updatedQuestion;
    try {
      updatedQuestion = await ProgressQuestions.query().updateAndFetchById(id, info);
      return [null, updatedQuestion];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findQuestionById(id, info, txn) {
    const { ProgressQuestions } = this.server.models();
    let question;
    try {
      question = await ProgressQuestions.query(txn).throwIfNotFound().findById(id);
      return [null, question];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getTrackingForm(pathwayId, txn) {
    const { PathwayFormStructure } = this.server.models();
    let formStructure;
    try {
      formStructure = await PathwayFormStructure.query(txn).where({ pathway_id: pathwayId });
      return [null, formStructure];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateTrackingForm(pathwayId, questionIds = [], paramIds = [], txn) {
    const { PathwayFormStructure } = this.server.models();
    const formStructure = await PathwayFormStructure.query(txn).where(
      { pathway_id: pathwayId },
      txn
    );

    const existingQuestionIds = _.fromPairs(
      formStructure.map((s) => [s.question_id, s]).filter((s) => s[0])
    );
    const existingParamIds = _.fromPairs(
      formStructure.map((s) => [s.parameter_id, s]).filter((s) => s[0])
    );

    const upsertObj = [];
    questionIds.forEach((qId) => {
      if (existingQuestionIds[qId]) {
        upsertObj.push(existingQuestionIds[qId]);
      } else {
        upsertObj.push({
          pathway_id: pathwayId,
          question_id: qId,
        });
      }
    });
    paramIds.forEach((pId) => {
      if (existingParamIds[pId]) {
        upsertObj.push(existingParamIds[pId]);
      } else {
        upsertObj.push({
          pathway_id: pathwayId,
          parameter_id: pId,
        });
      }
    });
    let updatedTrackingForm;
    try {
      updatedTrackingForm = await PathwayFormStructure.query(txn).upsertGraph(upsertObj);
      return [null, updatedTrackingForm];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // learning track status
  async createLearningTrackStatus(details) {
    const { LearningTrackStatusOutcome } = this.server.models();
    try {
      const user_team = details.team_id ?
        { 'team_id': details.team_id } : { 'user_id': details.user_id }
      const { data } = await strapi.findOne('exercises', details.exercise_id);
      if (data != null && data !== undefined) {
        const learningTrackData = await LearningTrackStatusOutcome.query().where({
          pathway_id: details.pathway_id,
          course_id: details.course_id,
          exercise_id: details.exercise_id,
        }).andWhere(user_team);
        if (learningTrackData.length <= 0) {
          await LearningTrackStatusOutcome.query().insert(details);
        }
        details.assessment_id = null;
        await this.insertPathwayOngoingTopic(details);
      }
      return [null, true];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async insertPathwayOngoingTopic(details) {
    const { PathwaysOngoingTopicOutcome } = this.server.models();
    try {
      const user_team = details.team_id ?
        { 'team_id': details.team_id } : { 'user_id': details.user_id }
      const ongoingTopic = await PathwaysOngoingTopicOutcome.query()
        .where("pathway_id", details.pathway_id)
        .andWhere(user_team);
      if (ongoingTopic.length <= 0) {
        details.user_id = parseInt(details.user_id);
        await PathwaysOngoingTopicOutcome.query().insert(details);
      } else {
        await PathwaysOngoingTopicOutcome.query()
          .patch(details)
          .where('pathway_id', details.pathway_id)
          .andWhere(user_team);
      }
      return [null, true];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getLearningTrackStatus(userId, courseId) {
    const { assessmentOutcome, ExerciseCompletionV2 } = this.server.models();
    const { classesService } = this.server.services();
    try {
      const course = {};
      const assessmentContent = [];
      const exerciseContent = [];
      const classContent = [];

      const { data } = await strapi.findOne('courses', courseId, {
        populate: ['assessments', 'exercises'],
      });

      const assessment = await data.attributes.assessments.data.map((ele) => {
        return {
          id: ele.id,
        };
      });

      const exercises = await data.attributes.exercises.data.map((ele) => {
        return {
          id: ele.id,
        };
      });

      for (const singleExercise of exercises) {
        // eslint-disable-next-line
        const learningTrackStatus = await ExerciseCompletionV2
          .query()
          .where('exercise_id', singleExercise.id)
          .andWhere('user_id', userId);


        if (
          // eslint-disable-next-line no-undef
          learningTrackStatus.length > 0 &&
          learningTrackStatus !== null &&
          learningTrackStatus !== undefined
        ) {
          exerciseContent.push(learningTrackStatus[0].exercise_id);
        }
      }

      // eslint-disable-next-line
      for (const assessmentData of assessment) {
        // eslint-disable-next-line
        const learningTrackStatus = await assessmentOutcome
          .query()
          .where('assessment_id', assessmentData.id)
          .andWhere('user_id', userId);
        if (
          // eslint-disable-next-line no-undef
          learningTrackStatus.length > 0 &&
          learningTrackStatus !== null &&
          learningTrackStatus !== undefined
        ) {
          if (learningTrackStatus[0].status === 'Pass') {
            assessmentContent.push(assessmentData.id);
          } else if (learningTrackStatus[0].attempt_count === 2) {
            assessmentContent.push(assessmentData.id);
          }
        }
      }
      const path = await strapi.findOne('courses', courseId, {
        populate: ['pathway'],
      });
      const pathwayId = await path.data.attributes.pathway.data.id;

      const classes = await classesService.getIfStudentEnrolled(userId, pathwayId);
      const userEnrolled = classes.message === 'enrolled';
      if (userEnrolled) {
        const [
          // eslint-disable-next-line
          errInRecurringClasses,
          recurringClasses,
        ] = await classesService.getCompleteEnrolledClasses(courseId, classes.recurring_id);
        if (
          recurringClasses.length > 0 &&
          recurringClasses !== null &&
          recurringClasses !== undefined
        ) {
          // eslint-disable-next-line
          for (const classData of recurringClasses) {
            classContent.push(classData.id);
          }
        }
      }
      course.exercises = exerciseContent;
      course.assessments = assessmentContent;
      course.classes = classContent;
      return [null, course];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getProgressTrackPercentage(userId, courseId) {
    const {
      LearningTrackStatusOutcome,
      assessmentOutcome,
      ExerciseCompletionV2
    } = this.server.models();
    const { coursesServiceV2, classesService } = this.server.services();
    try {
      const totalData = [];
      const attemptedData = [];
      const { data } = await strapi.findOne('courses', courseId, {
        populate: ['assessments', 'exercises'],
      });
      const exercises = data.attributes.exercises.data;
      const assessment = data.attributes.assessments.data;
      // eslint-disable-next-line
      for (const assessmentData of assessment) {
        // eslint-disable-next-line
        const assessmentlearningTrackStatus = await assessmentOutcome
          .query()
          .where('assessment_id', assessmentData.id)
          .andWhere('user_id', userId);

        attemptedData.push(...assessmentlearningTrackStatus);
      }

      for (const exercisesData of exercises) {
        // eslint-disable-next-line
        const exercisesDatalearningTrackStatus = await ExerciseCompletionV2
          .query()
          .where('exercise_id', exercisesData.id)
          .andWhere('user_id', userId);

        attemptedData.push(...exercisesDatalearningTrackStatus);
      }

      // eslint-disable-next-line
      const [errInPathwayId, getPathwayId] = await coursesServiceV2.getPathwayIdByCourseId(
        courseId
      );
      const classes = await classesService.getIfStudentEnrolled(userId, getPathwayId);
      const userEnrolled = classes.message === 'enrolled';
      if (userEnrolled) {
        const [
          // eslint-disable-next-line
          errInRecurringTotalClasses,
          recurringTotalClasses,
        ] = await classesService.getCompleteEnrolledClasses(
          courseId,
          classes.recurring_id,
          'total'
        );
        if (
          recurringTotalClasses.length > 0 &&
          recurringTotalClasses !== null &&
          recurringTotalClasses !== undefined
        ) {
          totalData.push(...recurringTotalClasses);
        }
        const [
          // eslint-disable-next-line
          errInRecurringClasses,
          recurringClasses,
        ] = await classesService.getCompleteEnrolledClasses(courseId, classes.recurring_id);
        if (
          recurringClasses.length > 0 &&
          recurringClasses !== null &&
          recurringClasses !== undefined
        ) {
          attemptedData.push(...recurringClasses);
        }
      }

      totalData.push(...exercises);

      totalData.push(...assessment);
      // eslint-disable-next-line
      let percentage = parseInt((attemptedData.length / totalData.length) * 100);
      // eslint-disable-next-line
      if(percentage > 100){
        percentage = 100;
      }
      return [null, isNaN(percentage) ? 0 : percentage];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }


  async getProgressTrackPercentagec4ca(team_id, courseId) {
    const {
      ExerciseCompletionV2,
      assessmentOutcome,
    } = this.server.models();
    try {
      const totalData = [];
      const attemptedData = [];
      const { data } = await strapi.findOne('courses', courseId, {
        populate: ['assessments', 'exercises'],
      });
      const exercises = data.attributes.exercises.data;
      const assessment = data.attributes.assessments.data;

      // eslint-disable-next-line
      for (const assessmentData of assessment) {
        // eslint-disable-next-line
        const assessmentlearningTrackStatus = await assessmentOutcome
          .query()
          .where('assessment_id', assessmentData.id)
          .andWhere('team_id', team_id);
        attemptedData.push(...assessmentlearningTrackStatus);
      }

      for (const exercisesData of exercises) {
        // eslint-disable-next-line
        const exercisesDatalearningTrackStatus = await ExerciseCompletionV2
          .query()
          .where('exercise_id', exercisesData.id)
          .andWhere('team_id', team_id);

        attemptedData.push(...exercisesDatalearningTrackStatus);
      }

      totalData.push(...exercises);
      totalData.push(...assessment);
      const percentage = parseInt((attemptedData.length / totalData.length) * 100);
      console.log(percentage)
      // eslint-disable-next-line
      return [null, isNaN(percentage) ? 0 : percentage];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }



  async removeDublicateDataInLearningTrackStatus() {
    const { LearningTrackStatusOutcome, ExercisesV2 } = this.server.models();
    try {
      const lrningTrkData = await LearningTrackStatusOutcome.query();
      // eslint-disable-next-line no-plusplus
      for (let ind = 0; ind < lrningTrkData.length; ind++) {
        // eslint-disable-next-line no-await-in-loop
        const ExerciseData = await ExercisesV2.query()
          .where('id', lrningTrkData[ind].exercise_id)
          .andWhere('course_id', lrningTrkData[ind].course_id);
        if (ExerciseData.length <= 0 || ExerciseData === null || ExerciseData === undefined) {
          // eslint-disable-next-line no-await-in-loop, no-unused-vars
          const deleteData = await LearningTrackStatusOutcome.query()
            .delete()
            .where('exercise_id', lrningTrkData[ind].exercise_id)
            .andWhere('course_id', lrningTrkData[ind].course_id);
        }
      }

      return [null, lrningTrkData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};