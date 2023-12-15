const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');
// const User = require('./users'); 

module.exports = class C4caPartners extends ModelBase {
  static get tableName() {
    return 'main.c4ca_partners';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().required(),
      user_id: Joi.number().integer().required(),
      phone_number: Joi.string().regex(/^[0-9]{10}$/),
      created_at:Joi.date().default(new Date()),

      
    //   created_at: Joi.date().default(new Date()),
    //   updated_at: Joi.date().default(new Date()),
      status: Joi.string()
        .valid('Newly Onboarded', 'Active', 'Inactive', 'Archived', 'Re Onboarded')
        .default('Newly Onboarded'),

    });
  }
  static get relationMappings() {
    /* eslint-disable */
    const C4caTeachers = require('./c4caTeachers');
    const User = require('./user');
    /* eslint-enable */
    return {
      teachers: {
        relation: Model.HasManyRelation,
        modelClass: C4caTeachers,
        // filter: (query) => query.select('id'),
        join: {
          from: 'main.c4ca_partners.id',
          to: 'main.c4ca_teachers.c4ca_partner_id',
        },
      },
      user: {
        relation: Model.HasManyRelation,
        modelClass: User,
        // filter: (query) => query.select('email','name'),

        join: {
          from: 'main.c4ca_partners.user_id',
          to: 'main.users.id',
          // to:'main.c4ca_partners.user_id'
        },
      },
      
    };
  };
};
