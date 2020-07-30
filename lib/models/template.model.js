const Schwifty = require('schwifty');
const Joi = require('@hapi/joi');

class ModelName extends Schwifty.Model {
  static get tableName() {
    return '';
  }

  static get joiSchema() {
    return Joi.object({});
  }
}

module.exports = {
  templateCode: ModelName,
  requires: ['schwifty', '@hapi/joi'],
};
