const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ExerciseCompletionV2 extends ModelBase {
  static get tableName() {
    return 'main.exercise_completion_v2';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().required().greater(0),
      exercise_id: Joi.number().integer().required().greater(0),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const ExercisesV2 = require('./exercisesV2');
    return {
      exercisesV2: {
        relation: Model.HasManyRelation,
        modelClass: ExercisesV2,
        filter: (query) => query.select('course_id', 'id'),
        join: {
          from: 'main.exercise_completion_v2.exercise_id',
          to: 'main.exercises_v2.id',
        },
      },
    };
  }

  async $afterInsert(queryContext) {
    // eslint-disable-next-line global-require
    const { checkCourseCompletionEligibility, insertIntoCourse } = require('../dbTriggers');
    const { transaction, user_id, exercise_id } = queryContext;
    this.checkAll = await checkCourseCompletionEligibility(transaction, user_id, exercise_id, 'V2');
    if (this.checkAll.status) {
      await insertIntoCourse(transaction, user_id, this.checkAll.courseId, 'V2');
    }
  }

  async $afterDelete(queryContext) {
    // eslint-disable-next-line global-require
    const { checkCourseCompletionEligibility, deleteFromCourse } = require('../dbTriggers');
    const { transaction, user_id, exercise_id } = queryContext;
    this.checkAll = await checkCourseCompletionEligibility(transaction, user_id, exercise_id, 'V2');
    if (!this.checkAll.status) {
      await deleteFromCourse(transaction, user_id, this.checkAll.courseId, 'V2');
    }
  }
};
