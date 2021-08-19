const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ClassesMail extends ModelBase {
  static get tableName() {
    return 'main.classes_mail';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      class_id: Joi.number(),
      facilitator_email: Joi.string(),
      status: Joi.string(),
      type: Joi.string(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const Classes = require('./classes');
    /* eslint-enable global-require */

    return {
      classes: {
        relation: Model.HasOneRelation,
        modelClass: Classes,
        join: {
          from: 'main.classes_mail.class_id',
          to: 'main.classes.id',
        },
      },
    };
  }
};
