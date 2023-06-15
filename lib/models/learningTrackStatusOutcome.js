const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class LearningTrackStatusOutcome extends ModelBase {
  static get tableName() {
    return 'main.learning_track_status_outcome';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().required(),
      pathway_id: Joi.number(),
      course_id: Joi.number(),
      exercise_id: Joi.number(),
    });
  }
};
