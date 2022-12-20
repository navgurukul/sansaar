const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');
const { Model } = require('objection');

module.exports = class CourseProductionVersions extends ModelBase {
  static get tableName() {
    return 'main.course_production_versions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_id: Joi.number().integer().required().greater(0),
      lang: Joi.string().valid('hi', 'en', 'te', 'mr', 'ta').lowercase(),
      version: Joi.string(),
    });
  }


  static get relationMappings() {
    /* eslint-disable global-require */
    const CoursesV2 = require('./coursesV2');

    /* eslint-enable global-require */
    return {
      courses: {
        relation: Model.HasOneRelation,
        modelClass: CoursesV2,
        join: {
          from: 'main.course_production_versions.course_id',
          to: 'main.courses_v2.id',
        },
      }, 
    };
  }
};
