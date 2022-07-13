const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ProductionVersions extends ModelBase {
  static get tableName() {
    return 'main.production_versions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_name: Joi.string().required(),
      lang: Joi.string().valid('hi', 'en', 'te', 'mr', 'ta').lowercase(),
      version: Joi.string(),
    });
  }
};
