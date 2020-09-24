const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');
const CONFIG = require('../config');

module.exports = class Pathways extends ModelBase {
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
      tracking_frequency: Joi.string()
        .when('tracking_enabled', {
          is: true,
          then: Joi.string().required(),
          otherwise: Joi.string().optional(),
        })
        .valid(...Object.keys(CONFIG.progressTracking.trackingFrequency))
        .allow(null),
      tracking_day_of_week: Joi.number()
        .integer()
        .when('tracking_enabled', {
          is: true,
          then: Joi.number().integer().required(),
          otherwise: Joi.number().integer().optional(),
        })
        .valid(
          ...Object.keys(CONFIG.progressTracking.trackingDayOfWeek).map((i) => parseInt(i, 10))
        )
        .allow(null),
      tracking_days_lock_before_cycle: Joi.number()
        .integer()
        .when('tracking_enabled', {
          is: true,
          then: Joi.number().integer().required(),
          otherwise: Joi.number().integer().optional(),
        })
        .allow(null),
      created_at: Joi.date(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const PathwayMilestone = require('./pathwayMilestone');
    const PathwayCourses = require('./pathwayCourses');
    const Courses = require('./courses');
    /* eslint-enable global-require */

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
      courses: {
        relation: Model.ManyToManyRelation,
        modelClass: Courses,
        join: {
          from: 'main.pathways.id',
          through: {
            modelClass: PathwayCourses,
            from: 'main.pathway_courses.pathway_id',
            to: 'main.pathway_courses.course_id',
            extra: ['created_at'],
          },
          to: 'main.courses.id',
        },
      },
    };
  }
};
