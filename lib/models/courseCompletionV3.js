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
      user_id: Joi.number().integer().required().greater(0),
      course_id: Joi.number().integer().required().greater(0),
      complete_at: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./user');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.course_completion_v3.user_id',
          to: 'main.users.id',
        },
      },
    };
  }
};
