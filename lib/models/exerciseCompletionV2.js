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
      user_id: Joi.number().integer(),
      exercise_id: Joi.number().integer().required().greater(0),
      complete_at: Joi.date(),
      team_id: Joi.number().integer(),
      slug_id: Joi.number().integer(),
      course_id: Joi.number().integer(),
      lang: Joi.string(),
    });
  }
};
