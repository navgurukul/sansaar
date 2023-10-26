const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caTeamProjectTopic extends ModelBase {
  static get tableName() {
    return 'main.c4ca_team_projecttopic';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      project_title: Joi.string().allow('').optional(),
      project_summary: Joi.string(),
      project_topic_url: Joi.string().allow('').optional(),
      created_at: Joi.date().required(),
      team_id: Joi.number().integer().greater(0).required(),
      team_name: Joi.string().required(),
      is_submitted: Joi.boolean().default(false),
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
          to: 'main.c4ca_team_projecttopic.team_id',
        },
      },
    };
  };
};