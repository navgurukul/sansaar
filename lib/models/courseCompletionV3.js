const Joi = require('@hapi/joi');
const { Model } = require('objection');

const ModelBase = require('./helpers/ModelBase');

module.exports = class CourseCompletionV3 extends ModelBase {
  static get tableName() {
    return 'main.course_completion_v3';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number(),
      course_id: Joi.number().integer().required().greater(0),
      complete_at: Joi.date(),
      team_id: Joi.number().integer().greater(0),
      percentage: Joi.number().integer(),
    });
  }

};
