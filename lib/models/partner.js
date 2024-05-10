const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Partner extends ModelBase {
  static get tableName() {
    return 'main.partners';
  }

  static get joiSchema() {
    return Joi.object({
      notes: Joi.string(),
      referred_by: Joi.string(),
      slug: Joi.string(),
      districts: Joi.array().items(Joi.string()).allow(null),
      meraki_link: Joi.string().allow(null),
      web_link: Joi.string().allow(null),
      description: Joi.string(),
      logo: Joi.string(),
      website_link: Joi.string(),

      id: Joi.number().integer().greater(0),
      name: Joi.string(),
      point_of_contact_name: Joi.string(),
      email: Joi.string().email().allow(null),
      state: Joi.string(),
      platform: Joi.string(),
      created_at: Joi.date().default(new Date()),
      updated_at: Joi.date().default(new Date()),
      status: Joi.string()
        .valid('Newly Onboarded', 'Active', 'Inactive', 'Archived', 'Re Onboarded')
        .default('Newly Onboarded'),
      phone_number: Joi.string().regex(/^[0-9]{10}$/),
    });
  }

  static get relationMappings() {
    /* eslint-disable */
    const User = require('./user');
    const PartnerUser = require('./partnerUser');
    const PartnerRelationship = require('./partnerRelationship');
    const PartnerSpace = require('./partnerSpace');
    /* eslint-enable */
    return {
      /* eslint-enable */
      spaces_data: {
        relation: Model.HasManyRelation,
        modelClass: PartnerSpace,
        join: {
          from: 'main.partners.id',
          to: 'main.partner_space.partner_id',
        },
      },
      users: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'main.partners.id',
          to: 'main.users.partner_id',
        },
        filter: (query) => query.select('name', 'id'),
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
