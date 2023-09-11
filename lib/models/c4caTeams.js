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
      team_members: Joi.string().required(),
      teacher_id: Joi.number().integer().greater(0).required(),
      login_id: Joi.string().required(),
      password: Joi.string().required(),
    });
  }

  static get relationMappings() {
    /* eslint-disable */
    const Teacher = require('./c4caTeachers');
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
    };
  };
};