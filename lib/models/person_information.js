const { Model } = require('objection');
const Joi = require('@hapi/joi');

class PersonInformation extends Model {
  static get tableName() {
    return 'main.person_information';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      email: Joi.string().email().optional(),
      state: Joi.string().optional(),
      number: Joi.string().optional(),
      created_at: Joi.date().iso(),
      updated_at: Joi.date().iso(),
    });
  }
}

module.exports = PersonInformation;

