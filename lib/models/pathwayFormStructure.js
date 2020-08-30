const ModelBase = require('./helpers/ModelBase');
const Joi = require('@hapi/joi');

module.exports = class PathwayFormStructure extends ModelBase {
  static get tableName() {
    return 'main.pathway_tracking_form_structure';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      pathway_id: Joi.number().integer().greater(0),
      parameter_id: Joi.number().integer().greater(0),
      question_id: Joi.number().integer().greater(0),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const Pathway = require('./pathway');
    const ProgressParameter = require('./progressParameter');
    const ProgressQuestion = require('./progressQuestion');
    /* eslint-disable global-require */

    return {
      pathway: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: Pathway,
        join: {
          from: 'main.pathway_tracking_form_structure.pathway_id',
          to: 'main.pathways.id',
        },
      },
      parameter: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: ProgressParameter,
        join: {
          from: 'main.pathway_tracking_form_structure.parameter_id',
          to: 'main.progress_parameters.id',
        },
      },
      question: {
        relation: ModelBase.BelongsToOneRelation,
        modelClass: ProgressQuestion,
        join: {
          from: 'main.pathway_tracking_form_structure.question_id',
          to: 'main.progress_questions.id',
        },
      },
    };
  }
};
