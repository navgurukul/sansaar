const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Courses extends ModelBase {
  static get tableName() {
    return 'main.courses';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      type: Joi.string().required(),
      name: Joi.string().required(),
      logo: Joi.string().required(),
      notes: Joi.string(),
      days_to_complete: Joi.number().integer().greater(0),
      short_description: Joi.string().required(),
      sequence_num: Joi.number().integer().greater(0),
    });
  }
};
