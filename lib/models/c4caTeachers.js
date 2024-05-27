const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class C4caTeachers extends ModelBase {
  static get tableName() {
    return 'main.c4ca_teachers';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string(),
      school: Joi.string(),
      district: Joi.string(),
      state: Joi.string(),
      phone_number: Joi.string().regex(/^[0-9]{10}$/),
      email: Joi.string(),
      profile_url: Joi.string(),
      user_id: Joi.number().integer().greater(0),
      c4ca_partner_id: Joi.number().integer().greater(0),
      facilitator_id: Joi.number().integer().greater(0),
      created_at:Joi.date().default(new Date())

      
    });
  }

  static get relationMappings() {
    /* eslint-disable */
    const User = require('./user');
    const Partner = require('./partner');
    const C4caTeams = require('./c4caTeams');

    /* eslint-enable */
    return {
      teams_data: {
        relation: Model.HasManyRelation,
        modelClass: C4caTeams,
        join: {
          from: 'main.c4ca_teachers.id',
          to: 'main.c4ca_teams.teacher_id',
        },
      },
      user_relationship: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'main.users.id',
          to: 'main.c4ca_teachers.user_id',
        },
      },
      partner_relationship: {
        relation: Model.HasManyRelation,
        modelClass: Partner,
        join: {
          from: 'main.partners.id',
          to: 'main.c4ca_teachers.partner_id',
        },
      },
    };
  }
};
