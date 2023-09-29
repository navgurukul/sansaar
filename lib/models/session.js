const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Session extends ModelBase {
  static get tableName() {
    return 'main.session';
  }

  static get joiSchema() {
    return Joi.object({
        id: Joi.number().integer().greater(0),
        session_name: Joi.string(),
        durations: Joi.number().integer().greater(0),
        user_id: Joi.number().integer().greater(0),
        start_time: Joi.date(),
        end_time: Joi.date(),
    })
}
}