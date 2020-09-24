const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class StudentPathways extends ModelBase {
  static get tableName() {
    return 'main.student_pathways';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0).required(),
      pathway_id: Joi.number().integer().greater(0).required(),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const User = require('./user');
    const Pathways = require('./pathway');
    /* eslint-enable global-require */

    return {
      pathway: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: Pathways,
        join: {
          from: 'main.student_pathways.pathway_id',
          to: 'main.pathways.id',
        },
      },
      user: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.student_pathways.user_id',
          to: 'main.users.id',
        },
      },
    };
  }
};
