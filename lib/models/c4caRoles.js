const Joi = require('@hapi/joi');
const _ = require('lodash');
const { Model } = require('objection');
const CONFIG = require('../config');
const Classes = require('./classes');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caRole extends ModelBase {
  static get tableName() {
    return 'main.c4ca_roles';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0).required(),
      teacher_id: Joi.number().integer().greater(0).required(),
      role: Joi.string()
        .valid(..._.values(CONFIG.roles.c4ca))
        .required(),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./user');
    const c4caTeacher = require('./c4caTeachers');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.c4ca_roles.user_id',
          to: 'main.users.id',
        },
      },

      c4caTeachers: {
        relation: Model.BelongsToOneRelation,
        modelClass: c4caTeacher,
        join: {
          from: 'main.c4ca_roles.user_id',
          to: 'main.c4ca_teachers.id',
        },
      },
    };
  }

};
