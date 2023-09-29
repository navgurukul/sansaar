const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ViewPage extends ModelBase {
  static get tableName() {
    return 'main.view_page';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0),
      durations: Joi.number().integer().required(),
      page_url: Joi.string(),    
      page_title: Joi.string(),
      created_at: Joi.date().default(() => new Date()), // Set default to the current date and time
    });
  }
};
