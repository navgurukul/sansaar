const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class LearningTrackStatus extends ModelBase {
  static get tableName() {
    return 'main.learning_track_status';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().required(),
      pathway_id: Joi.number(),
      course_id: Joi.number(),
      course_index: Joi.number(),
    });
  }
};
