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
    });
  }
};
