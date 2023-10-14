const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caTeachers extends ModelBase {
  static get tableName() {
    return 'main.c4ca_teachers';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().required(),
      school: Joi.string().required(),
      district: Joi.string().required(),
      state: Joi.string().required(),
      phone_number: Joi.string().regex(/^[0-9]{10}$/).required(),
      email: Joi.string().required(),
      profile_url: Joi.string().required(),
      user_id: Joi.number().integer().greater(0).required(),
      partner_id: Joi.number().integer().greater(0).required(),
    });
  }

  static get relationMappings() {
    /* eslint-disable */
    const User = require('./user');
    const Partner = require('./partner');
    /* eslint-enable */
    return {
      user_relationship: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'main.users.id',
          to: 'main.c4ca_teachers.user_id',
        },
      },
      partner_relationship: {
        relation: Model.HasManyRelation,
        modelClass: Partner,
        join: {
          from: 'main.partners.id',
          to: 'main.c4ca_teachers.partner_id',
        },
      },
    };
  };
};
