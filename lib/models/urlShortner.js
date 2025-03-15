/* eslint-disable no-unused-vars */
const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ShortLink extends ModelBase {
  static get tableName() {
    return 'main.short_links';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer(),
      short_code: Joi.string().max(10).required(),
      original_url: Joi.string().uri().required(),
      created_at: Joi.date().iso().required(),
      last_accessed: Joi.date().iso().allow(null),
    });
  }
};