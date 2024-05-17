const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class mainmerakilogin extends ModelBase {
  static get tableName() {
    return 'main.meraki';
  }
  static get joiSchema() {
    return Joi.object({
      username: Joi.string(),
      password: Joi.number().required(),
    });
  }
 
}