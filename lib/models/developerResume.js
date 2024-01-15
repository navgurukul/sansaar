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
      password: Joi.string(),
      role: Joi.string(),
      education: Joi.string(),
      intrests: Joi.string(),
      skills: Joi.string(),
      experience: Joi.string(),
      programming_languages: Joi.string(),
      resonal_language: Joi.string(),
      known_framworks: Joi.string(),
      learning_plan: Joi.string(),
    });
  }
};
