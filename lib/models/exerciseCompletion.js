const Joi = require('@hapi/joi');
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
};
