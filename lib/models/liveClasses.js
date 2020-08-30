const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class LiveClasses extends ModelBase {
  static get tableName() {
    return 'main.live_classes';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0).required(),
      name: Joi.string().required(),
      description: Joi.string().required(),
      facilitator_id: Joi.number().integer().greater(0).required(),
      start_time: Joi.date().required(),
      end_time: Joi.date().required(),
      exercise_id: Joi.number().integer(),
      course_id: Joi.number().integer(),
      category_id: Joi.number().integer().required(),
      video_id: Joi.string(),
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
          from: 'main.live_classes.exercise_id',
          to: 'main.courses.id',
        },
      },
    };
  }
};
