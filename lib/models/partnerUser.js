const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PartnerUser extends ModelBase {
  static get tableName() {
    return 'main.partner_user';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      partner_id: Joi.number(),
      email: Joi.string().email().required(),
      is_partner_group: Joi.boolean(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const Partner = require('./partner');
    /* eslint-enable global-require */

    return {
      partner: {
        relation: Model.BelongsToOneRelation,
        modelClass: Partner,
        join: {
          from: 'main.partner_user.partner_id',
          to: 'main.partners.id',
        },
      },
    };
  }

  async $beforeInsert() {
    const now = new Date();
    this.created_at = now;
  }
};
