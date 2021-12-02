const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayCoursesV2 extends ModelBase {
  static get tableName() {
    return 'main.pathway_courses_v2';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer(),
      course_id: Joi.number().integer().greater(0).required(),
      pathway_id: Joi.number().integer().greater(0).required(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const CoursesV2 = require('./coursesV2');

    return {
      coursesV2: {
        relation: CoursesV2.HasManyRelation,
        modelClass: CoursesV2,
        join: {
          from: 'main.pathway_courses_v2.course_id',
          to: 'main.courses_v2.id',
        },
      },
    };
  }
};
