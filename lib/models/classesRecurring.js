const { Model } = require('objection');
const Joi = require('@hapi/joi').extend(require('@joi/date'));
const ModelBase = require('./helpers/ModelBase');

module.exports = class RecurringClasses extends ModelBase {
  static get tableName() {
    return 'main.recurring_classes';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      frequency: Joi.string().valid('DAILY', 'WEEKLY'),
      on_days: Joi.string(),
      occurence: Joi.number().integer().greater(0),
      until: Joi.date().when('occurence', {
        not: Joi.exist(),
        then: Joi.date().format('YYYY-MM-DD').utc().greater(Joi.ref('end_time')),
        otherwise: Joi.forbidden(),
      }),
      calendar_event_id: Joi.string(),
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
          from: 'main.recurring_classes.id',
          to: 'main.classes.recurring_id',
        },
      },
    };
  }
};
