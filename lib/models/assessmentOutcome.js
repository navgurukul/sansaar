const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class assessmentOutcome extends ModelBase {
  static get tableName() {
    return 'main.assessment_outcome';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().required(),
      assessment_id: Joi.number().integer().required(),
      status: Joi.string(),
      selected_option: Joi.number().integer().greater(0).less(5),
      attempt_count: Joi.number().integer().greater(0).less(3).required(),
      multiple_choise: Joi.string(),
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
          from: 'main.assessment_outcome.user_id',
          to: 'main.users.id',
        },
      },
    };
  }
};
