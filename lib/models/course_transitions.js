const Joi = require('@hapi/joi');
// const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Course_transitions extends ModelBase {
  static get tableName() {
    return 'course_transitions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_version_id: Joi.number().integer().greater(0).required(),
      state: Joi.string(),
      user_id: Joi.number().integer().greater(0).required(),
    });
  }
};
