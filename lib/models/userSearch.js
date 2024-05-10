const { number } = require('@hapi/joi');
const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class UserSearch extends ModelBase {
  static get tableName() {
    return 'main.users_search';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer(),
      name: Joi.string().required(),
      created_at: Joi.date().required(),
    });
  }
};
