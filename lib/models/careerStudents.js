const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CareerStudents extends ModelBase {
  static get tableName() {
    return 'main.career_students';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().min(3).max(100).required(),
      class: Joi.number().integer().greater(0).required(),
      career_teacher_id: Joi.number().integer().greater(0).required(),
      career_team_id: Joi.number().integer().greater(0).required(),
      created_at: Joi.date(),
      updated_at: Joi.date()
    });
  }

  static get relationMappings() {
    const Teacher = require('./careerTeachers');
    const Teams = require('./careerTeams');

    return {
      teacher_relationship: {
        relation: Model.BelongsToOneRelation,
        modelClass: Teacher,
        join: {
          from: 'main.career_students.career_teacher_id',
          to: 'main.career_teachers.id',
        },
      },
      teams_relationship: {
        relation: Model.BelongsToOneRelation,
        modelClass: Teams,
        join: {
          from: 'main.career_students.career_team_id',
          to: 'main.career_teams.id',
        },
      },
    };
  }
};
