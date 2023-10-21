const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class assessmentOutcome extends ModelBase {
  static get tableName() {
    return 'main.assessment_outcome';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer(),
      team_id:Joi.number().integer(),
      assessment_id: Joi.number().integer().required(),
      status: Joi.string(),
      selected_option: Joi.string(),
      attempt_count: Joi.number().integer().greater(0).less(3).required(),
      // multiple_choice: Joi.string(),
    });
  }
};
