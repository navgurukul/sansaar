const Joi = require('@hapi/joi');
const _ = require('lodash');
const { Model } = require('objection');
const CONFIG = require('../config');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CareerRoles extends ModelBase {
  static get tableName() {
    return 'main.career_roles';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0).required(),
      role: Joi.string()
        .valid(..._.values(CONFIG.roles.careerManagement))
        .required(),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    const User = require('./user');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.career_roles.user_id',
          to: 'main.users.id',
        },
      },
    };
  }

};
