const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Practice extends ModelBase {
    static get tableName() {
      return 'friend';
    }
    static get joiSchema() {
        return Joi.object({
          id: Joi.number().integer().greater(0),
          user_id: Joi.string().required() 
        })
    }
}