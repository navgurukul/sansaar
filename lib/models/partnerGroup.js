const { Model } = require('objection');
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
      base_group: Joi.boolean().required(),
    });
  }

  static get relationMappings() {
    /* eslint-disable */
    const PartnerRelationship = require('./partnerRelationship');
    const PartnerGroupRelationship = require('./partnerGroupRelationship');
    const PartnerGroupUser = require('./partnerGroupUser');
    /* eslint-enable */
    return {
      partner_relationship: {
        relation: Model.HasManyRelation,
        modelClass: PartnerRelationship,
        join: {
          from: 'main.partner_group.id',
          to: 'main.partner_relationship.partner_group_id',
        },
      },
      partner_group_relationship: {
        relation: Model.HasManyRelation,
        modelClass: PartnerGroupRelationship,
        join: {
          from: 'main.partner_group.id',
          to: 'main.partner_group_relationship.partner_group_id',
        },
      },
      partner_group_user: {
        relation: Model.HasManyRelation,
        modelClass: PartnerGroupUser,
        join: {
          from: 'main.partner_group.id',
          to: 'main.partner_group_user.partner_group_id',
        },
      },
    };
  }

  async $beforeInsert() {
    const now = new Date();
    this.created_at = now;
  }
};
