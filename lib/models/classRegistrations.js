const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ClassRegistrations extends ModelBase {
  static get tableName() {
    return 'main.class_registrations';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      class_id: Joi.number().integer().required(),
      user_id: Joi.number().integer().required(),
      registered_at: Joi.date().required(),
      feedback: Joi.string(),
      feedback_at: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const Classes = require('./classes');
    // eslint-disable-next-line global-require
    const Users = require('./user');

    return {
      classes: {
        relation: Model.HasManyRelation,
        modelClass: Classes,
        join: {
          from: 'main.class_registrations.class_id',
          to: 'main.classes.id',
        },
      },
      users: {
        relation: Model.HasOneRelation,
        modelClass: Users,
        join: {
          from: 'main.class_registrations.user_id',
          to: 'main.users.id',
        },
      },
    };
  }
};
