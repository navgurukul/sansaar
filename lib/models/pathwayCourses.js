const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayCourses extends ModelBase {
  static get tableName() {
    return 'main.pathway_courses';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer(),
      course_id: Joi.number().integer().greater(0).required(),
      pathway_id: Joi.number().integer().greater(0).required(),
      created_at: Joi.date().required(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const Courses = require('./courses');
    return {
      courses: {
        relation: Courses.HasManyRelation,
        modelClass: Courses,
        join: {
          from: 'main.pathway_courses.course_id',
          to: 'main.courses.id',
        },
      },
    };
  }
};
