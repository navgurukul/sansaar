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
      profile_picture: Joi.string().uri().required(),
      google_user_id: Joi.string().required(),
      github_link: Joi.string().uri(),
      linkedin_link: Joi.string().uri(),
      createdAt: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const UserRole = require('./userRole');
    const Pathway = require('./pathway');
    const StudentPathway = require('./studentPathway');
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
        modelClass: Pathway,
        join: {
          from: 'main.users.id',
          through: {
            modelClass: StudentPathway,
            from: 'main.student_pathways.user_id',
            to: 'main.student_pathways.pathway_id',
            extra: ['id', 'created_at'],
          },
          to: 'main.pathways.id',
        },
      },
    };
  }

  async $beforeInsert() {
    const now = new Date();
    this.createdAt = now;
  }
};
