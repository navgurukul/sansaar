const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Pathway extends ModelBase {
  static get tableName() {
    return 'main.pathways';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      code: Joi.string().max(6).required().uppercase(),
      name: Joi.string().max(45).required(),
      description: Joi.string().max(5000).required(),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const PathwayMilestone = require('./pathwayMilestone');
    const PathwayCourses = require('./pathwayCourses');
    return {
      milestones: {
        relation: Model.HasManyRelation,
        modelClass: PathwayMilestone,
        join: {
          from: 'main.pathways.id',
          to: 'main.pathway_milestones.pathway_id',
        },
      },
      pathwayCourses: {
        relation: Model.HasManyRelation,
        modelClass: PathwayCourses,
        join: {
          from: 'main.pathways.id',
          to: 'main.pathway_courses.pathway_id',
        },
      },
    };
  }
};
