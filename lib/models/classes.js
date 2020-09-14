const { Model, raw } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Classes extends ModelBase {
  static get tableName() {
    return 'main.classes';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      title: Joi.string(),
      description: Joi.string(),
      facilitator_id: Joi.number().integer().greater(0),
      start_time: Joi.date(),
      end_time: Joi.date(),
      exercise_id: Joi.number(),
      course_id: Joi.number(),
      category_id: Joi.number().integer(),
      video_id: Joi.string(),
      lang: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      class_type: Joi.string().valid('workshop', 'doubt_class'),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const Courses = require('./courses');
    return {
      courses: {
        relation: Model.HasOneRelation,
        modelClass: Courses,
        join: {
          from: 'main.classes.exercise_id',
          to: 'main.courses.id',
        },
      },
    };
  }
};
