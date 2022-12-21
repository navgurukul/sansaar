const Joi = require('@hapi/joi');
// const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Course_states extends ModelBase {
  static get tableName() {
    return 'course_states';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      state_id: Joi.number().integer().greater(0).required(),
      state_name: Joi.string(),
    });
  }
};
