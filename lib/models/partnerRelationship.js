const { Model } = require('objection');
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

  static get relationMappings() {
    /* eslint-disable global-require */
    const User = require('./user');
    const Partner = require('./partner');
    const PartnerGroup = require('./partnerGroup');
    /* eslint-enable global-require */

    return {
      partner: {
        relation: Model.BelongsToOneRelation,
        modelClass: Partner,
        join: {
          from: 'main.partner_relationship.partner_id',
          to: 'main.partners.id',
        },
      },
      partner_group: {
        relation: Model.BelongsToOneRelation,
        modelClass: PartnerGroup,
        join: {
          from: 'main.partner_relationship.partner_group_id',
          to: 'main.partner_group.id',
        },
      },
      users: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'main.partner_relationship.partner_id',
          to: 'main.users.partner_id',
        },
      },
    };
  }
};
