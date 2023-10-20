const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Facilitator extends ModelBase {
    static get tableName() {
        return 'main.facilitators';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            name: Joi.string().required(),
            point_of_contact: Joi.string(),
            email: Joi.string().email().required(),
            teacher_invite_link: Joi.string(),
            partner_id: Joi.number().integer().required(),
        });
    }
};