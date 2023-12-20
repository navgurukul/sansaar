const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class LearningProgress extends ModelBase {
  static get tableName() {
    return 'main.learning_progress';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      developers_resume_id: Joi.number().integer().greater(0).required(),
      learning_resource_id: Joi.number().integer().greater(0).required(),
      completed: Joi.boolean().default(false),
      created_at: Joi.date(),
    });
  }
  
  $beforeUpdate() {
    const now = new Date();
    this.created_at = now;
  }
}

