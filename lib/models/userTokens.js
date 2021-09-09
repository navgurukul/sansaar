const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class UserTokens extends ModelBase {
  static get tableName() {
    return 'main.user_tokens';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0).required(),
      user_email: Joi.string().email().required(),
      access_token: Joi.string().required(),
      refresh_token: Joi.string().required(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./user');
    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'main.user_tokens.user_id',
          to: 'main.users.id',
        },
      },
    };
  }
};
