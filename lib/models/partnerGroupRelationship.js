const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PartnerGroupRelationship extends ModelBase {
  static get tableName() {
    return 'main.partner_group_relationship';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      partner_group_id: Joi.number().integer(),
      member_of: Joi.number().integer(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const PartnerGroup = require('./partnerGroup');
    const PartnerRelationship = require('./partnerRelationship');
    /* eslint-enable global-require */

    return {
      partner_group: {
        relation: Model.BelongsToOneRelation,
        modelClass: PartnerGroup,
        join: {
          from: 'main.partner_group_relationship.partner_group_id',
          to: 'main.partner_group.id',
        },
      },
      partner_member_of: {
        relation: Model.BelongsToOneRelation,
        modelClass: PartnerGroup,
        join: {
          from: 'main.partner_group_relationship.member_of',
          to: 'main.partner_group.id',
        },
      },
      partners: {
        relation: Model.HasManyRelation,
        modelClass: PartnerRelationship,
        join: {
          from: 'main.partner_group_relationship.partner_group_id',
          to: 'main.partner_relationship.partner_group_id',
        },
      },
    };
  }
};
