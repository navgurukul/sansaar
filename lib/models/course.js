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
      notes: Joi.string().required(),
      short_description: Joi.string().required(),
      description: Joi.string().max(5000).required(),
      sequence_num: Joi.number().integer().greater(0),
    });
  }
};
