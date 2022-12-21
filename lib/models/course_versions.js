const Joi = require('@hapi/joi');
// const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Course_versions extends ModelBase {
  static get tableName() {
    return 'course_versions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_id: Joi.number().integer().greater(0).required(),
      version: Joi.string(),
    });
  }
};
