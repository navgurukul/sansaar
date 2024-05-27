const Joi = require('@hapi/joi');
const { Model } = require('objection');

const ModelBase = require('./helpers/ModelBase');

module.exports = class ModuleCompletionV2 extends ModelBase {
  static get tableName() {
    return 'main.module_completion_v2';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number(),
      module_id: Joi.number().integer().required().greater(0),
      complete_at: Joi.date(),
      team_id: Joi.number().integer().greater(0),
      percentage: Joi.number().integer(),
    });
  }

};
