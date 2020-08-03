const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayMilestone extends ModelBase {
  static get tableName() {
    return 'main.pathway_milestones';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().max(45).required(),
      description: Joi.string().max(5000).required(),
      pathway_id: Joi.number().integer().greater(0).required(),
      position: Joi.number().integer().greater(-1),
      createdAt: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const Pathway = require('./pathway');

    return {
      pathway: {
        relation: Model.BelongsToOneRelation,
        modelClass: Pathway,
        join: {
          from: 'main.pathway_milestones.pathway_id',
          to: 'main.pathways.id',
        },
      },
    };
  }
};
