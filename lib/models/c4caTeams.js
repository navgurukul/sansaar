const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caTeams extends ModelBase {
  static get tableName() {
    return 'main.c4ca_teams';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      team_name: Joi.string().required(),
      team_size: Joi.number().integer().greater(2).less(6).required(),
      teacher_id: Joi.number().integer().greater(0).required(),
      login_id: Joi.string().required(),
      password: Joi.string().required(),
      last_login: Joi.date(),
      school: Joi.string(),
      district: Joi.string(),
      state: Joi.string(),
    });
  }

  static get relationMappings() {
    /* eslint-disable */
    const Teacher = require('./c4caTeachers');
    const Student = require('./c4ca_student');
    const PathwayCompletionV2 = require('./pathwayCompletionV2');
    const C4caTeamProjectSubmitSolution = require('./c4caProjectsubmitSolution');

    /* eslint-enable */
    return {
      teacher_relationship: {
        relation: Model.HasManyRelation,
        modelClass: Teacher,
        join: {
          from: 'main.c4ca_teachers.id',
          to: 'main.c4ca_teams.teacher_id',
        },
      },
      pathway_completion_relationship: {
        relation: Model.HasManyRelation,
        modelClass: PathwayCompletionV2,
        filter: (query) => query.select('percentage'),
        join: {
          from: 'main.pathway_completion_v2.team_id',
          to: 'main.c4ca_teams.id',
        },
      },
      teams_projects: {
        relation: Model.HasManyRelation,
        modelClass: C4caTeamProjectSubmitSolution,
        join: {
          from: 'main.c4ca_teams.id',
          to: 'main.c4ca_team_projectsubmit_solution.team_id',
        },
      },
    };
  }
};
