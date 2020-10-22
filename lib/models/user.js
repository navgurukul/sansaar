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
      partner_id: Joi.integer().optional(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const UserRole = require('./userRole');
    const Pathways = require('./pathway');
    const StudentPathways = require('./studentPathway');
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
    };
  }

  async $beforeInsert() {
    const now = new Date();
    this.created_at = now;
  }
};
