const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PartnerGroupUser extends ModelBase {
  static get tableName() {
    return 'main.partner_group_user';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer(),
      partner_group_id: Joi.number().integer(),
      email: Joi.string(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const PartnerGroup = require('./partnerGroup');
    /* eslint-enable global-require */

    return {
      partner_group: {
        relation: Model.BelongsToOneRelation,
        modelClass: PartnerGroup,
        join: {
          from: 'main.partner_group_user.partner_group_id',
          to: 'main.partner_group.id',
        },
      },
    };
  }
};
