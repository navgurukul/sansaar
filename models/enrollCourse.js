const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CourseEnrolments extends ModelBase {
  static get tableName() {
    return 'main.course_enrolments';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      student_id: Joi.number().integer().greater(0).required(),
      course_id: Joi.number().integer().greater(0).required(),
      enrolled_at: Joi.date(),
      completed_at: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const Courses = require('./courses');

    return {
      courses: {
        relation: Model.HasManyRelation,
        modelClass: Courses,
        join: {
          from: 'main.course_enrolments.course_id',
          to: 'main.courses.id',
        },
      },
    };
  }
};
