const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CourseEnrolments extends ModelBase {
  static get tableName() {
    return 'main.course_enrolments';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0).required(),
      student_id: Joi.number().integer().greater(0).required(),
      course_id: Joi.number().integer().greater(0).required(),
      enrolled_at: Joi.date(),
      course_status: Joi.string().required(),
      completed_at: Joi.date(),
    });
  }
};
