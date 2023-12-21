const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class LearningResource extends ModelBase {
  static get tableName() {
    return 'main.learning_resources';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_name: Joi.string().required(),
      course_url: Joi.string().uri().required(),
      course_description: Joi.string(),
      course_category: Joi.string(),
    });
  }
}

