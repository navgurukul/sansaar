const ModelBase = require('./helpers/ModelBase');
const Joi = require('@hapi/joi');

module.exports = class ModelName extends ModelBase {
  static get tableName() {
    return '';
  }

  static get joiSchema() {
    return Joi.object({});
  }
};
