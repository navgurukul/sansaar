const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwaysOngoingTopicOutcome extends ModelBase {
  static get tableName() {
    return 'main.pathways_ongoing_topic_outcome';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().allow(null),
      team_id: Joi.number().allow(null),
      pathway_id: Joi.number(),
      module_id:Joi.number().integer().positive().allow(null),

      course_id: Joi.number().allow(null),
      exercise_id: Joi.number().allow(null),
      assessment_id: Joi.number().allow(null),
      project_topic_id: Joi.number().allow(null),
      project_solution_id: Joi.number().allow(null),
      slug_id: Joi.number().integer().required(),
      type: Joi.string().required(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const User = require('./user');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.pathways_ongoing_topic_outcome.user_id',
          to: 'main.users.id',
        },
      },
    };
  }

};