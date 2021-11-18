const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwaysV2 extends ModelBase {
  static get tableName() {
    return 'main.pathways_v2';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      code: Joi.string().max(6).required().uppercase(),
      name: Joi.string().max(45).required(),
      description: Joi.string().max(5000).required(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const CoursesV2 = require('./coursesV2');
    const PathwayCourses = require('./pathwayCourses');
    /* eslint-enable global-require */

    return {
      pathwayCourses: {
        relation: Model.HasManyRelation,
        modelClass: PathwayCourses,
        join: {
          from: 'main.pathways_v2.id',
          to: 'main.pathway_courses.pathway_id',
        },
      },
      coursesV2: {
        relation: Model.ManyToManyRelation,
        modelClass: CoursesV2,
        join: {
          from: 'main.pathways_v2.id',
          through: {
            modelClass: PathwayCourses,
            from: 'main.pathway_courses.pathway_id',
            to: 'main.pathway_courses.course_id',
          },
          to: 'main.courses_v2.id',
        },
      },
    };
  }
};
