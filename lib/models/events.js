const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Events extends ModelBase {
  static get tableName() {
    return 'main.events';
  }

  static get joiSchema() {
    return Joi.object({
        id: Joi.number().integer().greater(0),
        session_id: Joi.number().integer().greater(0),
        view_page_id: Joi.number().integer().greater(0),
        durations: Joi.number().integer().greater(0),
        user_id: Joi.number().integer().greater(0),
        event_name: Joi.string(),
        start_time: Joi.date(),
        end_time: Joi.date(),
    })
}
}