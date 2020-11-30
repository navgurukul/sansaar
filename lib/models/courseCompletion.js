const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CourseCompletion extends ModelBase {
  static get tableName() {
    return 'main.course_completion';
  }

  static get joiSchema() {
    return Joi.object({
      user_id: Joi.number().integer().required().greater(0),
      course_id: Joi.number().integer().required().greater(0),
    });
  }
};
