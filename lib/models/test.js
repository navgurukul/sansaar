const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ModelName extends ModelBase {
  static get tableName() {
    return '';
  }

  static get joiSchema() {
    return Joi.object({});
  }
};
