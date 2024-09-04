const { Model } = require('objection');
const Joi = require('@hapi/joi');

class NewUserDemo extends Model {
    static get tableName() {
        return 'newUserDemo';
    }

    static get idColumn() {
        return 'id';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            name: Joi.string(),
            email: Joi.string().email(),
            contact: Joi.string().min(1).max(20),
        });
    }
}

module.exports = NewUserDemo;

