const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PartnerGroup extends ModelBase {
  static get tableName() {
    return 'main.partner_group';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().required(),
      partners: Joi.array().items(Joi.string()),
      subgroups: Joi.array().items(Joi.string()),
      emails: Joi.array().items(Joi.string()),
    });
  }

  async $beforeInsert() {
    const now = new Date();
    this.created_at = now;
  }
};
