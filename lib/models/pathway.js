const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');
const CONFIG = require('../config');

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
      tracking_enabled: Joi.bool().required(),
      tracking_frequency: Joi.string().when('tracking_enabled', {
        is: true,
        then: Joi.string().required()
      }).valid(...Object.keys(CONFIG.progressTracking.trackingFrequency)),
      tracking_day_of_week: Joi.number().integer().when('tracking_enabled', {
        is: true,
        then: Joi.number().integer().required()
      }).valid(...Object.keys(CONFIG.progressTracking.trackingDayOfWeek)),
      tracking_days_lock_before_cycle: Joi.number().integer().when('tracking_enabled', {
        is: true,
        then: Joi.number().integer().required()
      }),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const PathwayMilestone = require('./pathwayMilestone');

    return {
      milestones: {
        relation: Model.HasManyRelation,
        modelClass: PathwayMilestone,
        join: {
          from: 'main.pathways.id',
          to: 'main.pathway_milestones.pathway_id',
        },
      },
    };
  }
};
