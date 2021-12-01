const Joi = require('@hapi/joi');
const { Model } = require('objection');
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
    // eslint-disable-next-line global-require
    const Pathway = require('./pathway');
    return {
      courses: {
        relation: Courses.HasManyRelation,
        modelClass: Courses,
        join: {
          from: 'main.pathway_courses.course_id',
          to: 'main.courses.id',
        },
      },
      pathway: {
        relation: Model.BelongsToOneRelation,
        modelClass: Pathway,
        filter: (query) => query.select('name'),
        join: {
          from: 'main.pathway_courses.pathway_id',
          to: 'main.pathways.id',
        },
      },
    };
  }

  async $beforeInsert() {
    const now = new Date();
    this.created_at = now;
  }
};
