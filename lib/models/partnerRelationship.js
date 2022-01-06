const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PartnerRelationship extends ModelBase {
  static get tableName() {
    return 'main.partner_relationship';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      partner_id: Joi.number().integer(),
      partner_group_id: Joi.number().integer(),
    });
  }
};
