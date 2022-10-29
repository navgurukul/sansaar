const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Volunteer extends ModelBase {
  static get tableName() {
    return 'main.volunteer';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0).required(),
      pathway_id: Joi.number().integer().greater(0).required(),
      hours_per_week: Joi.number().integer(),
      available_on_days: Joi.string(),
      available_on_time: Joi.string(),
      status: Joi.string(),
      manual_status: Joi.string(),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const User = require('./user');
    const PathwaysV2 = require('./pathwaysV2');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.volunteer.user_id',
          to: 'main.users.id',
        },
      },
      pathway: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: PathwaysV2,
        join: {
          from: 'main.volunteer.pathway_id',
          to: 'main.pathways_v2.id',
        },
      },
    };
  }
};
