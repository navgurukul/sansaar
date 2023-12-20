const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class DevelopersResume extends ModelBase {
  static get tableName() {
    return 'main.developers_resume';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string(),
      email: Joi.string().email(),
      role: Joi.string(),
      education: Joi.string(),
      skills: Joi.string(),
      experience: Joi.string(),
      programming_languages: Joi.string(),
      resonal_language: Joi.string(),
      learning_resource_id: Joi.number().integer().greater(0).allow(null),
    });
  }
};
