const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayCourses extends ModelBase {
  static get tableName() {
    return 'main.pathway_courses';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer(),
      courseId: Joi.number().integer().greater(0),
      pathwayId: Joi.number().integer().greater(0),
      sequenceNum: Joi.number().integer().greater(0),
      createdAt: Joi.date(),
      updatedAt: Joi.date(),
    });
  }

  static get relationMappings() {
    const Courses = require('./courses');
    return {
      courses: {
        relation: Courses.HasOneRelation,
        modelClass: Courses,
        join: {
          from: 'main.pathway_courses.course_id',
          to: 'main.courses.id',
        },
      },
    };
  }
};
