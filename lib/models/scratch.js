/* eslint-disable no-unused-vars */
const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Scratch extends ModelBase {
  static get tableName() {
    return 'main.scratch';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      project_id: Joi.string().required(),
      url: Joi.string().required(),
      userId_scratch: Joi.number().integer(),
      project_name: Joi.string(),
      updated_at: Joi.date(),
      team_id: Joi.number().integer(),
    });
  }

  $beforeUpdate() {
    const now = new Date();
    this.updated_at = now;
  }

  $beforeInsert() {
    const now = new Date();
    this.updated_at = now;
  }
};
