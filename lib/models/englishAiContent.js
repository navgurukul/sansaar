const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class EnglishAiContent extends ModelBase {
  static get tableName() {
    return 'main.english_ai_content';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      title: Joi.string().max(200).required(),
      content: Joi.string(),
      level: Joi.number().integer().greater(0).required(),
      link: Joi.string(),
    });
  }
};
