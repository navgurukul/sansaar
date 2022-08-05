const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PartnerSpecificBatches extends ModelBase {
  static get tableName() {
    return 'main.partner_specific_batches';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      class_id: Joi.number().integer(),
      recurring_id: Joi.number().integer(),
      partner_id: Joi.number().integer().required(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line
    const RecurringClasses = require('./classesRecurring');
    // eslint-disable-next-line
    const Partner = require('./partner');
    // eslint-disable-next-line
    const Classes = require('./classes');

    return {
      parent_class: {
        relation: Model.BelongsToOneRelation,
        modelClass: RecurringClasses,
        join: {
          from: 'main.partner_specific_batches.recurring_id',
          to: 'main.recurring_classes.id',
        },
      },
      classes: {
        relation: Model.HasManyRelation,
        modelClass: Classes,
        join: {
          from: 'main.partner_specific_batches.class_id',
          to: 'main.classes.id',
        },
      },
      partner: {
        relation: Model.BelongsToOneRelation,
        modelClass: Partner,
        join: {
          from: 'main.partner_specific_batches.partner_id',
          to: 'main.partners.id',
        },
      },
    };
  }
};
