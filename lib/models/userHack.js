const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class UserHack extends ModelBase {
  static get tableName() {
    return 'main.user_hack';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      email: Joi.string().email(),
      name: Joi.string(),
    })
}
}