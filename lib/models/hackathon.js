const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Hackathon extends ModelBase {
    static get tableName() {
        return 'hackathon_for_temp';
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

