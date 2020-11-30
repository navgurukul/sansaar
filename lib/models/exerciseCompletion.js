const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ExerciseCompletion extends ModelBase {
  static get tableName() {
    return 'main.exercise_completion';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().required().greater(0),
      exercise_id: Joi.number().integer().required().greater(0),
    });
  }

  static get relationMappings() {
    const Exercises = require('./exercise');
    return {
      exercises: {
        relation: Model.HasManyRelation,
        modelClass: Exercises,
        filter: (query) => query.select('course_id', 'id'),
        join: {
          from: 'main.exercise_completion.exercise_id',
          to: 'main.exercises.id',
        },
      },
    };
  }

  async $afterInsert(queryContext) {
    const { checkCourseCompletionEligibility } = require('../dbTriggers');
    const { transaction, user_id, exercise_id } = queryContext;
    const checkAll = await checkCourseCompletionEligibility(
      transaction,
      'exercises',
      user_id,
      exercise_id
    );
    console.log(checkAll);
  }

  // async $afterDelete(queryContext) {
  //   console.log('***************************************');
  //   console.log(queryContext);
  //   console.log('***************************************');
  //   const { checkCourseCompletionEligibility } = require('../dbTriggers');
  //   const { transaction, user_id, exercise_id } = queryContext;
  //   console.log(user_id, exercise_id);
  //   const checkAll = await checkCourseCompletionEligibility(
  //     transaction,
  //     'exercises',
  //     user_id,
  //     exercise_id
  //   );
  //   console.log(checkAll);
  // }
};
