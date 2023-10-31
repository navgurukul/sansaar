const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class UserSession extends ModelBase {
  static get tableName() {
    return 'main.user_session';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.string().required(),
    });
  }
};
