const Joi = require('@hapi/joi');
const ModelBase = require('./ModelBase');

class ModelName extends ModelBase {
  static get tableName() {
    return '';
  }

  static get joiSchema() {
    return Joi.object({});
  }
}

module.exports = {
  templateCode: ModelName,
  requires: ['./helpers/ModelBase', '@hapi/joi'],
};
