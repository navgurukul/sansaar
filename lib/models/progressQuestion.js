const Joi = require('@hapi/joi');
const _ = require('lodash');
const ModelBase = require('./helpers/ModelBase');
const CONFIG = require('../config');

module.exports = class ProgressQuestion extends ModelBase {
  static get tableName() {
    return 'main.progress_questions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      type: Joi.string().valid(..._.keys(CONFIG.progressTracking.questions.type)),
      created_at: Joi.date(),
    });
  }
};
