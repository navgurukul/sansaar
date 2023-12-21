const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class HackathonAnswer extends ModelBase {
    static get tableName() {
        return 'main.hackathon_answers';
    }
    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            question_id: Joi.number().integer().required(),
            answers: Joi.string(),
            email: Joi.string().email().required(),
        });
    }
}