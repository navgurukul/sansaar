const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class assessmentsHistory extends ModelBase {
  static get tableName() {
    return 'main.assessments_history';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer(),
      team_id: Joi.number().integer(),
      slug_id: Joi.number().integer().required(),
      course_id: Joi.number().integer().required(),
      status: Joi.string().required(),
      attempt_count: Joi.number().integer().greater(0).less(3).required(),
      selected_option: Joi.string().required(),
      lang: Joi.string().required(),
      created_at: Joi.date(),
      updated_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable */
    const User = require('./user');
    const C4caTeams = require('./c4caTeams');

    /* eslint-enable */
    return {
      teams_data: {
        relation: Model.HasManyRelation,
        modelClass: C4caTeams,
        join: {
          from: 'main.c4ca_teams.id',
          to: 'main.assessments_history.team_id',
        },
      },
      user_relationship: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'main.users.id',
          to: 'main.assessments_history.user_id',
        },
      },
    };
  }
};
