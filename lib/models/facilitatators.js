const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Facilitator extends ModelBase {
  static get tableName() {
    return 'main.facilitators';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().required(),
      point_of_contact: Joi.string(),
      email: Joi.string().email().required(),
      web_link: Joi.string().allow(null),
      c4ca_partner_id: Joi.number().integer().required(),
      phone_number: Joi.string().regex(/^[0-9]{10}$/),
      created_at: Joi.date().default(new Date()),
    });
  }

  static get relationMappings() {
    const C4caTeachers = require('./c4caTeachers');
    /* eslint-enable */
    return {
      teachers_data: {
        relation: Model.HasManyRelation,
        modelClass: C4caTeachers,
        join: {
          from: 'main.facilitators.id',
          to: 'main.c4ca_teachers.facilitator_id',
        },
      },
    };
  }
};
