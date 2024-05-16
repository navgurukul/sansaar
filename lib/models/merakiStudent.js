const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class MerakiStudent extends ModelBase {
    static get tableName() {
        return 'main.meraki_students';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            login_id: Joi.string().required(),
            name: Joi.string().required(),
            password: Joi.string().required(),
            partner_id: Joi.number().integer().greater(0),
            created_at: Joi.date(),
        });
    }
};

