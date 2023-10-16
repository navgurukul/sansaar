const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caTeamProjectSubmitSolution extends ModelBase {
  static get tableName() {
    return 'main.c4ca_team_projectsubmit_solution';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      project_link: Joi.string().required(),
      project_file_url: Joi.string().required(),
      team_id: Joi.number().integer().greater(0).required(),
      team_name: Joi.string().required(),
    });
  }
  static get relationMappings() {
    /* eslint-disable */
    const Teams = require('./c4caTeams');
    /* eslint-enable */
    return {
      teams_relationship: {
        relation: Model.HasManyRelation,
        modelClass: Teams,
        join: {
          from: 'main.c4ca_teams.id',
          to: 'main.c4ca_team_projectsubmit_solution.team_id',
        },
      },
    };
  };
};
