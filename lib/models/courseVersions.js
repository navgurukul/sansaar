const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CourseVersions extends ModelBase {
  static get tableName() {
    return 'main.course_versions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_name: Joi.string().required(),
      lang: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      version: Joi.string(),
    });
  }
};
