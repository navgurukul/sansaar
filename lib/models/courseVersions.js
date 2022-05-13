const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CourseVersions extends ModelBase {
  static get tableName() {
    return 'main.course_versions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_name: Joi.string().required(),
      lang: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      version: Joi.string(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const CoursesV2 = require('./coursesV2');
    return {
      coursesV2: {
        relation: Model.HasOneRelation,
        modelClass: CoursesV2,
        join: {
          from: 'main.course_versions.course_name',
          to: 'main.courses_v2.name',
        },
      },
    };
  }
};
