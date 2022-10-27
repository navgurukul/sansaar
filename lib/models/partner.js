const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Partner extends ModelBase {
  static get tableName() {
    return 'main.partners';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().required(),
      notes: Joi.string(),
      slug: Joi.string().required(),
      created_at: Joi.date(),
      referred_by: Joi.string(),
      email: Joi.string().email().allow(null),
      districts: Joi.array().items(Joi.string()).allow(null),
      meraki_link: Joi.string().allow(null),
      web_link: Joi.string().allow(null),
      partner_discription: Joi.string(),
      partner_logo: Joi.string(),
    });
  }

  static get relationMappings() {
    /* eslint-disable */
    const User = require('./user');
    const PartnerUser = require('./partnerUser');
    const PartnerRelationship = require('./partnerRelationship');
    /* eslint-enable */
    return {
      users: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'main.partners.id',
          to: 'main.users.partner_id',
        },
        filter: (query) => query.select('name'),
      },
      partner_relationship: {
        relation: Model.HasManyRelation,
        modelClass: PartnerRelationship,
        join: {
          from: 'main.partners.id',
          to: 'main.partner_relationship.partner_id',
        },
      },
      partnerUser: {
        relation: Model.HasManyRelation,
        modelClass: PartnerUser,
        join: {
          from: 'main.partners.id',
          to: 'main.partner_user.partner_id',
        },
      },
    };
  }
};
