const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class MentorTree extends ModelBase {
  static get tableName() {
    return 'main.mentor_tree';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      mentor_id: Joi.number().integer().greater(0).required(),
      mentee_id: Joi.number().integer().greater(0).required(),
      pathway_id: Joi.number().integer().greater(0).required(),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const User = require('./user');
    const Pathway = require('./pathway');
    /* eslint-enable global-require */

    return {
      mentor: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.mentor_tree.mentor_id',
          to: 'main.users.id',
        },
      },
      mentee: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.mentor_tree.mentee_id',
          to: 'main.users.id',
        },
      },
      pathway: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: Pathway,
        join: {
          from: 'main.mentor_tree.pathway_id',
          to: 'main.pathways.id',
        },
      },
    };
  }
};
