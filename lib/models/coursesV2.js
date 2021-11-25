const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CoursesV2 extends ModelBase {
  static get tableName() {
    return 'main.courses_v2';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().required(),
      logo: Joi.string().required(),
      short_description: Joi.string().required(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const ExercisesV2 = require('./exercisesV2');
    return {
      exercisesV2: {
        relation: Model.HasManyRelation,
        modelClass: ExercisesV2,
        join: {
          from: 'main.courses_v2.id',
          to: 'main.exercises_v2.course_id',
        },
      },
    };
  }
};
