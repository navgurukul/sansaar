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
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line
    const User = require('./user');
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
    };
  }
};
