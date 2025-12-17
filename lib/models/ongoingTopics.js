const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class OngoingTopics extends ModelBase {
  static get tableName() {
    return 'main.ongoing_topics';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().allow(null),
      team_id: Joi.number().allow(null),
      pathway_id: Joi.number().required(),
      course_id: Joi.number().required(),
      slug_id: Joi.number().required(),
      type: Joi.string().required(),
      module_id: Joi.number().integer().positive().allow(null),
      project_topic_id: Joi.number().allow(null),
      project_solution_id: Joi.number().allow(null),
      created_at: Joi.date(),
      updated_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const User = require('./user');
    const C4caTeams = require('./c4caTeams');
    const TeamSolution = require('./c4caProjectsubmitSolution');
    const TeamProjecttopic = require('./c4caProjectTopic');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.ongoing_topics.user_id',
          to: 'main.users.id',
        },
      },

      teams_data: {
        relation: Model.BelongsToOneRelation,
        modelClass: C4caTeams,
        join: {
          from: 'main.c4ca_teams.id',
          to: 'main.ongoing_topics.team_id',
        },
      },

      teams_project: {
        relation: Model.BelongsToOneRelation,
        modelClass: TeamProjecttopic,
        join: {
          from: 'main.c4ca_team_projecttopic.id',
          to: 'main.ongoing_topics.project_topic_id',
        },
      },

      teams_solution: {
        relation: Model.BelongsToOneRelation,
        modelClass: TeamSolution,
        join: {
          from: 'main.c4ca_team_projectsubmit_solution.id',
          to: 'main.ongoing_topics.project_solution_id',
        },
      },
    };
  }
};
