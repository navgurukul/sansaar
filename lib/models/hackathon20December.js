const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class HackathonLogin extends ModelBase {
    static get tableName() {
        return 'main.hackathon_login';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().required(),
        });
    }
}