const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwaysOngoingTopicOutcome extends ModelBase {
  static get tableName() {
    return 'main.pathways_ongoing_topic_outcome';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().required(),
      pathway_id: Joi.number(),
      course_id: Joi.number(),
      exercise_id: Joi.number(),
      assessment_id: Joi.number().allow(null),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const User = require('./user');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.pathways_ongoing_topic_outcome.user_id',
          to: 'main.users.id',
        },
      },
    };
  }

};