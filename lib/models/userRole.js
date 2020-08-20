const Joi = require('@hapi/joi');
const _ = require('lodash');
const { Model } = require('objection');
const CONFIG = require('../config');
const ModelBase = require('./helpers/ModelBase');

module.exports = class UserRole extends ModelBase {
  static get tableName() {
    return 'main.sansaar_user_roles';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0).required(),
      role: Joi.string()
        .valid(..._.values(CONFIG.roles.all))
        .required(),
      createdAt: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./user');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.sansaar_user_roles.user_id',
          to: 'main.users.id',
        },
      },
    };
  }

  async $beforeInsert() {
    await super.$beforeInsert();
    const now = new Date();
    this.createdAt = now;
  }
};
