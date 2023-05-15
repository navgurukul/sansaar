const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayPartnerGroup extends ModelBase {
  static get tableName() {
    return 'main.pathway_partner_group';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      partner_id: Joi.number().integer().greater(0),
      pathway_id: Joi.number().integer().greater(0),
    });
  }
};
