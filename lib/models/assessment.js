const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Assessment extends ModelBase {
  static get tableName() {
    return 'main.assessment';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().max(100).required(),
      content: Joi.string(),
      course_id: Joi.number().integer().greater(0).required(),
      exercise_id: Joi.number().integer().greater(0).required(),
      updated_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const CoursesV2 = require('./coursesV2');
    const ExercisesV2 = require('./exercisesV2');

    /* eslint-enable global-require */
    return {
      coursesV2: {
        relation: Model.HasOneRelation,
        modelClass: CoursesV2,
        join: {
          from: 'main.assessment.course_id',
          to: 'main.courses_v2.id',
        },
      },
      exercisesV2: {
        relation: Model.HasOneRelation,
        modelClass: ExercisesV2,
        join: {
          from: 'main.assessment.exercise_id',
          to: 'main.exercises_v2.id',
        },
      },
    };
  }

  $beforeUpdate() {
    const now = new Date();
    this.updated_at = now;
  }
};
