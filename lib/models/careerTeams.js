const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CareerTeams extends ModelBase {
  static get tableName() {
    return 'main.career_teams';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      team_name: Joi.string().required(),
      team_size: Joi.number().integer().greater(2).less(6).required(),
      career_teacher_id: Joi.number().integer().greater(0).required(),
      login_id: Joi.string().required(),
      password: Joi.string().required(),
      last_login: Joi.date(),
      school: Joi.string(),
      district: Joi.string(),
      state: Joi.string(),
      created_at: Joi.date(),
      updated_at: Joi.date()

    });
  }

  static get relationMappings() {
    const Teacher = require('./careerTeachers');
  
    return {
      teacher_relationship: {
        relation: Model.BelongsToOneRelation,
        modelClass: Teacher,
        join: {
          from: 'main.career_teams.career_teacher_id',
          to: 'main.career_teachers.id',
        },
      },
    };
  };
};
