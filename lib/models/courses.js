const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Courses extends ModelBase {
  static get tableName() {
    return 'main.courses';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      type: Joi.string().required(),
      name: Joi.string().required(),
      logo: Joi.string().required(),
      short_description: Joi.string().required(),
      lang_available: Joi.array()
        .items(Joi.string().valid('hi', 'en', 'te', 'ta').lowercase())
        .allow(null),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const Exercises = require('./exercise');
    return {
      exercises: {
        relation: Model.HasManyRelation,
        modelClass: Exercises,
        // filter: (query) => query.select('id', 'name', 'slug'),
        join: {
          from: 'main.courses.id',
          to: 'main.exercises.course_id',
        },
      },
    };
  }
};
