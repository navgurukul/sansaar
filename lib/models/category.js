const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Category extends ModelBase {
  static get tableName() {
    return 'main.category';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      category_name: Joi.string().max(45).required(),
      created_at: Joi.date().required(),
    });
  }
};
