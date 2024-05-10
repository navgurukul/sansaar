const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class LearningTrackStatus extends ModelBase {
  static get tableName() {
    return 'main.learning_track_status';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer(),
      team_id: Joi.number().integer(),
      pathway_id: Joi.number(),
      course_id: Joi.number(),
      exercise_id: Joi.number(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const ExercisesV2 = require('./exercisesV2');
    return {
      exercisesV2: {
        relation: Model.HasOneRelation,
        modelClass: ExercisesV2,
        join: {
          from: 'main.learning_track_status.exercise_id',
          to: 'main.exercises_v2.id',
        },
      },
    };
  }
};
