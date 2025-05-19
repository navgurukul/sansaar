const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CareerTeachers extends ModelBase {
  static get tableName() {
    return 'main.career_teachers';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().min(3).max(100).required(),
      school: Joi.string().min(3).max(100).required(),
      district: Joi.string().min(3).max(100).required(),
      state: Joi.string().min(2).max(100).required(),
      phone_number: Joi.string().regex(/^[0-9]{10}$/),
      email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu'] } }).required(),
      profile_url: Joi.string().uri().allow(null),
      user_id: Joi.number().integer().greater(0).required(),
      cluster_manager_id: Joi.number().integer().greater(0).required(),
      created_at: Joi.date(),
      updated_at: Joi.date()
    });
  }

  static get relationMappings() {
    const User = require('./user');
    const CareerTeams = require('./careerTeams');

    return {
      teams_data: {
        relation: Model.HasManyRelation,
        modelClass: CareerTeams,
        join: {
          from: 'main.career_teachers.id',
          to: 'main.career_teams.career_teacher_id',
        },
      },
      user_data: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.career_teachers.user_id',
          to: 'main.users.id',
        },
      },
    };
  }
};
