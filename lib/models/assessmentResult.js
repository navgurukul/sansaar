const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class assessmentResult extends ModelBase {
  static get tableName() {
    return 'main.assessment_result';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().required(),
      assessment_id: Joi.number().integer().required(),
      status: Joi.string(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./user');
    // eslint-disable-next-line global-require
    const Assessment = require('./assessment');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.assessment_result.user_id',
          to: 'main.users.id',
        },
      },
      assessment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Assessment,
        join: {
          from: 'main.assessment_result.assessment_id',
          to: 'main.assessment.id',
        },
      },
    };
  }
};
