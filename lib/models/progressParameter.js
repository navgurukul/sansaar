const Joi = require('@hapi/joi');
const _ = require('lodash');
const ModelBase = require('./helpers/ModelBase');
const CONFIG = require('../config');

module.exports = class ProgressParameters extends ModelBase {
  static get tableName() {
    return 'main.progress_parameters';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      type: Joi.string()
        .valid(..._.keys(CONFIG.progressTracking.parameters.type))
        .required(),
      name: Joi.string().max(20).required(),
      description: Joi.string().max(5000).required(),
      min_range: Joi.number()
        .integer()
        .when('type', {
          is: Joi.string().valid(CONFIG.progressTracking.parameters.type.range.key),
          then: Joi.number().integer().required(),
        }),
      max_range: Joi.number()
        .integer()
        .when('type', {
          is: Joi.string().valid(CONFIG.progressTracking.parameters.type.range.key),
          then: Joi.number().integer().required(),
        }),
      created_at: Joi.date(),
    });
  }
};
