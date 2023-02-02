const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Record extends ModelBase {
  static get tableName() {
    return 'main.record';
  }

  static get joiSchema() {
    return Joi.object({
      course_id: Joi.number().integer().greater(0).required(),
      exercise_id: Joi.date().required(),
    });
  }
};
