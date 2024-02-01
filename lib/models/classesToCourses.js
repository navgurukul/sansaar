const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ClassesToCourses extends ModelBase {
  static get tableName() {
    return 'main.classes_to_courses';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer(),
      class_id: Joi.number().integer().greater(0).allow(null),
      pathway_v1: Joi.number().integer().greater(0).allow(null),
      course_v1: Joi.number().integer().greater(0).allow(null),
      exercise_v1: Joi.number().integer().greater(0).allow(null),
      pathway_v2: Joi.number().integer().greater(0).allow(null),
      course_v2: Joi.number().integer().greater(0).allow(null),
      exercise_v2: Joi.number().integer().greater(0).allow(null),
      pathway_v3: Joi.number().integer().greater(0).allow(null),
      course_v3: Joi.number().integer().greater(0).allow(null),
      exercise_v3: Joi.number().integer().greater(0).allow(null),
      slug_id: Joi.number().integer().required(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const Classes = require('./classes');

    return {
      class: {
        relation: Model.BelongsToOneRelation,
        modelClass: Classes,
        join: {
          from: 'main.classes_to_courses.class_id',
          to: 'main.classes.id',
        },
      },
    };
  }
};
