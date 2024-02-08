const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwaysOngoingTopic extends ModelBase {
  static get tableName() {
    return 'main.pathways_ongoing_topic';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().required(),
      pathway_id: Joi.number().integer(),
      course_id: Joi.number().integer(),
      exercise_id: Joi.number().integer().allow(null),
      assessment_id: Joi.number().integer().allow(null),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const CoursesV2 = require('./coursesV2');
    const PathwaysV2 = require('./pathwaysV2');
    const ExercisesV2 = require('./exercisesV2');
    const User = require('./user');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.pathways_ongoing_topic.user_id',
          to: 'main.users.id',
        },
      },

      pathway: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: PathwaysV2,
        join: {
          from: 'main.pathways_ongoing_topic.pathway_id',
          to: 'main.pathways_v2.id',
        },
      },

      coursesV2: {
        relation: Model.HasOneRelation,
        modelClass: CoursesV2,
        join: {
          from: 'main.pathways_ongoing_topic.course_id',
          to: 'main.courses_v2.id',
        },
      },

      exercisesV2: {
        relation: Model.HasOneRelation,
        modelClass: ExercisesV2,
        join: {
          from: 'main.pathways_ongoing_topic.exercise_id',
          to: 'main.exercises_v2.id',
        },
      },

    };
  }
};
