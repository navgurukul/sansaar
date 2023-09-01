const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Gtagame extends ModelBase {
    static get tableName() {
        return 'gta_game';
    }

    static get joiSchema() {
        return Joi.object({
            first_name: Joi.string().required(),
            last_name: Joi.string().required(),
            gender: Joi.string().required(),
            country: Joi.string(),
            password: Joi.string().required(),
            user_id: Joi.string().required(),
        });
    }
};

