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
      user_id: Joi.number().integer(),
      registered_at: Joi.date(),
      feedback: Joi.string(),
      feedback_at: Joi.date(),
      google_registration_status: Joi.boolean(),
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
      facilitator: {
        relation: Model.ManyToManyRelation,
        modelClass: Users,
        filter: (query) => query.select('name'),
        join: {
          from: 'main.class_registrations.class_id',
          through: {
            modelClass: Classes,
            from: 'main.classes.id',
            to: 'main.classes.facilitator_id',
          },
          to: 'main.users.id',
        },
      },
    };
  }
};
