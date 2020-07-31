const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class User extends ModelBase {
  static get tableName() {
    return 'main.users';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0).required(),
      email: Joi.string().email(),
      name: Joi.string(),
      profile_picture: Joi.string().uri(),
      github_link: Joi.string().uri(),
      linkedin_link: Joi.string().uri(),
      createdAt: Joi.date(),
    });
  }

  async $beforeInsert() {
    const now = new Date();
    this.createdAt = now;
  }
};
