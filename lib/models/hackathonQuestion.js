const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class HackathonQuestion extends ModelBase {
    static get tableName() {
        return 'main.hackathon_questions';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            email: Joi.string().email().required(),
            questions: Joi.string().required(),
        });
    }
}