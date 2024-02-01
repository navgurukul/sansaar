const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caPartners extends ModelBase {
  static get tableName() {
    return 'main.c4ca_partners';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().required(),
      point_of_contact: Joi.string().required(),
      email: Joi.string().email().allow(null),
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
      }
    };
  };
};
