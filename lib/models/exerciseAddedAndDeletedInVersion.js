const Joi = require('@hapi/joi');
// const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class exerciseAddedAndDeletedInVersion extends ModelBase {
  static get tableName() {
    return 'exerciseAddedAndDeletedInVersion';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      Course_id: Joi.number().integer().greater(0).required(),
      exercise_id: Joi.number().integer().greater(0).required(),
      version: Joi.string(),
      updated: Joi.string(),
    });
  }
};
