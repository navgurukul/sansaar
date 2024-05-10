const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Certificate extends ModelBase {
  static get tableName() {
    return 'main.meraki_certificate';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer(),
      url: Joi.string(),
      register_at: Joi.string(),
      pathway_code: Joi.string(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./user');

    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'main.meraki_certificate.user_id',
          to: 'main.users.id',
        },
      },
    };
  }

  async $beforeInsert() {
    const now = new Date();
    this.created_at = now;
  }
};
