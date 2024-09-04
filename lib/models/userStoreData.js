const { Model } = require('objection');
const Joi = require('@hapi/joi');

class UserStoreData extends Model {
  static get tableName() {
    return 'main.user_store_data';
  }

  static get joiSchema() {
    return joi.object({
        id:joi.number().integer().greater(0),
        name:joi.string(),
        email:joi.string().email(),
        contact:joi.string(),
        created_at: Joi.date().iso(),
        updated_at: Joi.date().iso(),
    })
}
}

module.exports =  UserStoreData ;
