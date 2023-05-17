const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class MergedClasses extends ModelBase {
  static get tableName() {
    return 'main.merged_classes';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      class_id: Joi.number().integer().greater(0),
      merged_class_id: Joi.number().integer().greater(0),
    });
  }
};
