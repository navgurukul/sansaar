
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
      email: Joi.string().email(),
      name: Joi.string(),
      profile_picture: Joi.string(),
      google_user_id: Joi.string(),
      github_link: Joi.string().uri(),
      linkedin_link: Joi.string().uri(),
      created_at: Joi.date(),
      chat_id: Joi.string().optional(),
      chat_password: Joi.string().length(32).optional(),
      partner_id: Joi.number().integer().optional().allow(null),
      space_id: Joi.number().integer().optional().allow(null),
      group_id: Joi.number().integer().optional().allow(null),
      lang_1: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      lang_2: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      mode: Joi.string().allow(null).valid('web', 'android'),
      contact: Joi.string()
        .min(7)
        .max(15)
        .pattern(/^(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}|\(\d{1,4}\)[\s-]?\d{6,10}|\d{1,4}[\s-]?\d{6,10})$/),
      last_login_at: Joi.date().timestamp(),
      c4ca_partner_id: Joi.number().integer().optional().allow(null),
      c4ca_facilitator_id: Joi.number().integer().optional().allow(null),
      cluster_manager_id: Joi.number().integer().optional().allow(null), // for ai-career-exploration
      user_name: Joi.string().optional(),
      password: Joi.string().optional(),
      pass_iv: Joi.string().optional(),
      auth_tag: Joi.string().optional(),
    });
  }
  static get relationMappings() {
    const UserRole = require('./userRole');
    const Pathways = require('./pathway');
    const PathwaysV2 = require('./pathwaysV2');
    const Classes = require('./classes');
    const ClassRegistrations = require('./classRegistrations');
    const StudentPathways = require('./studentPathway');
    const Partner = require('./partner');
    const Volunteer = require('./volunteer');
    const C4caRole = require('./c4caRoles');

    return {
      roles: {
        relation: Model.HasManyRelation,
        modelClass: UserRole,
        join: {
          from: 'main.users.id',
          to: 'main.sansaar_user_roles.user_id',
        },
      },
      c4ca_roles: {
        relation: Model.HasManyRelation,
        modelClass: C4caRole,
        filter: (query) => query.select('role'),
        join: {
          from: 'main.users.id',
          to: 'main.c4ca_roles.user_id',
        },
      },
      volunteer: {
        relation: Model.HasManyRelation,
        modelClass: Volunteer,
        join: {
          from: 'main.users.id',
          to: 'main.volunteer.user_id',
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
      pathwaysV2: {
        relation: Model.ManyToManyRelation,
        modelClass: PathwaysV2,
        join: {
          from: 'main.users.id',
          through: {
            modelClass: StudentPathways,
            from: 'main.student_pathways.user_id',
            to: 'main.student_pathways.pathway_id',
            extra: ['created_at'],
          },
          to: 'main.pathways_v2.id',
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