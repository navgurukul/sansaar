const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caStudents extends ModelBase {
  static get tableName() {
    return 'main.c4ca_students';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().required(),
      class: Joi.number().required(),
      teacher_id: Joi.number().integer().greater(0).required(),
      team_id: Joi.number().integer().greater(0).required(),
      created_at:Joi.date().default(new Date())

    });
  }
  static get relationMappings() {
    /* eslint-disable */
    const Teacher = require('./c4caTeachers');
    const Teams = require('./c4caTeams');
    /* eslint-enable */
    return {
      teacher_relationship: {
        relation: Model.HasManyRelation,
        modelClass: Teacher,
        join: {
          from: 'main.c4ca_teachers.id',
          to: 'main.c4ca_students.teacher_id',
        },
      },
      teams_relationship: {
        relation: Model.HasManyRelation,
        modelClass: Teams,
        join: {
          from: 'main.c4ca_teams.id',
          to: 'main.c4ca_students.team_id',
        },
      },
    };
  };
};
