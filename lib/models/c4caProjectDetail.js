const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caStudentsProjectDetail extends ModelBase {
  static get tableName() {
    return 'main.c4ca_students_projectDetail';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      project_title: Joi.string().required(),
      project_summary: Joi.number().required(),
      project_uploadFile_url: Joi.string().required(),
      date: Joi.date().required(),
      teacher_id: Joi.number().integer().greater(0).required(),
      team_id: Joi.number().integer().greater(0).required(),
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
          to: 'main.c4ca_students_projectDetail.teacher_id',
        },
      },
      teams_relationship: {
        relation: Model.HasManyRelation,
        modelClass: Teams,
        join: {
          from: 'main.c4ca_teams.id',
          to: 'main.c4ca_students_projectDetail.team_id',
        },
      },
    };
  };
};
