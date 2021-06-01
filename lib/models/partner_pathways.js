/* eslint-disable global-require */
const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class partner_pathways extends ModelBase {
  static get tableName() {
    return 'main.partner_pathways';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      partner_id: Joi.number().integer().greater(0),
      pathway_id: Joi.number().integer().greater(0),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line;
    const Pathways = require('./pathway');
    const Partners = require('./partner');
    return {
      partners: {
        relation: Model.BelongsToOneRelation,
        modelClass: Partners,
        join: {
          from: 'main.partner_pathways.partner_id',
          to: 'main.partners.id',
        },
      },
      pathways: {
        relation: Model.BelongsToOneRelation,
        modelClass: Pathways,
        join: {
          from: 'main.partner_pathways.pathway_id',
          to: 'main.pathways.id',
        },
      },
    };
  }
};
