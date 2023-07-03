const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class pathwaysOngoingTopicOutcome extends ModelBase {
  static get tableName() {
    return 'main.pathways_ongoing_topic_outcome';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().required(),
      pathway_id: Joi.number(),
      course_id: Joi.number(),
      exercise_id: Joi.number(),
      assessment_id: Joi.number(),
    });
  }

};
