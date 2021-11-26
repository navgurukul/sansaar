const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class User extends ModelBase {
  static get tableName() {
    return 'main.users';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      email: Joi.string().email().required(),
      name: Joi.string().required(),
      profile_picture: Joi.string().uri(),
      google_user_id: Joi.string(),
      github_link: Joi.string().uri(),
      linkedin_link: Joi.string().uri(),
      created_at: Joi.date(),
      chat_id: Joi.string()
        // .pattern(/^@([a-z0-9])+:(navgurukul.org)$/)
        .optional(),
      chat_password: Joi.string().length(32).optional(),
      partner_id: Joi.number().integer().optional(),
      lang_1: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      lang_2: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      mode: Joi.string().allow(null).valid('web', 'android'),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const UserRole = require('./userRole');
    const Pathways = require('./pathway');
    const Classes = require('./classes');
    const ClassRegistrations = require('./classRegistrations');
    const StudentPathways = require('./studentPathway');
    const Partner = require('./partner');
    /* eslint-enable global-require */

    return {
      roles: {
        relation: Model.HasManyRelation,
        modelClass: UserRole,
        join: {
          from: 'main.users.id',
          to: 'main.sansaar_user_roles.user_id',
        },
      },
      pathways: {
        relation: Model.ManyToManyRelation,
        modelClass: Pathways,
        join: {
          from: 'main.users.id',
          through: {
            modelClass: StudentPathways,
            from: 'main.student_pathways.user_id',
            to: 'main.student_pathways.pathway_id',
            extra: ['created_at'],
          },
          to: 'main.pathways.id',
        },
      },
      registrations: {
        relation: Model.HasManyRelation,
        modelClass: ClassRegistrations,
        filter: (query) => query.select('class_id', 'feedback', 'feedback_at'),
        join: {
          from: 'main.users.id',
          to: 'main.class_registrations.user_id',
        },
      },
      classes: {
        relation: Model.ManyToManyRelation,
        modelClass: Classes,
        join: {
          from: 'main.users.id',
          through: {
            modelClass: ClassRegistrations,
            from: 'main.class_registrations.user_id',
            to: 'main.class_registrations.class_id',
          },
          to: 'main.classes.id',
        },
      },
      partner: {
        relation: Model.BelongsToOneRelation,
        modelClass: Partner,
        join: {
          from: 'main.users.partner_id',
          to: 'main.partners.id',
        },
      },
    };
  }

  async $beforeInsert() {
    const now = new Date();
    this.created_at = now;
  }
};
