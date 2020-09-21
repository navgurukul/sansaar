const Joi = require('@hapi/joi');
const _ = require('lodash');
const ModelBase = require('./helpers/ModelBase');
const CONFIG = require('../config');

module.exports = class ProgressQuestions extends ModelBase {
  static get tableName() {
    return 'main.progress_questions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().max(20).required(),
      description: Joi.string().max(5000).required(),
      type: Joi.string().valid(..._.keys(CONFIG.progressTracking.questions.type)),
      created_at: Joi.date(),
    });
  }
};
