const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayCompletionV2 extends ModelBase {
  static get tableName() {
    return 'main.pathway_completion_v2';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number(),
      pathway_id: Joi.number().integer().required().greater(0),
      complete_at: Joi.date(),
      team_id: Joi.number().integer().greater(0),
      percentage: Joi.number().integer(),
    });
  }
};
