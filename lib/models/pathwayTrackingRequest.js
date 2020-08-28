const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');
const CONFIG = require('../config');

module.exports = class PathwayTrackingRequest extends ModelBase {
  static get tableName() {
    return 'main.pathway_tracking_request';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      mentor_id: Joi.number().integer().greater(0).required(),
      mentee_id: Joi.number().integer().greater(0).required(),
      pathway_id: Joi.number().integer().greater(0).required(),
      status: Joi.string().valid(...Object.keys(CONFIG.progressTracking.requestType)),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const Pathway = require('./pathway');
    const User = require('./user');
    /* eslint-disable global-require */

    return {
      pathway: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: Pathway,
        join: {
          from: 'main.pathway_tracking_request.pathway_id',
          to: 'main.pathways.id',
        },
      },
      mentor: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.pathway_tracking_request.mentor_id',
          to: 'main.users.id',
        },
      },
      mentee: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.pathway_tracking_request.mentor_id',
          to: 'main.users.id',
        },
      },
    };
  }
};
