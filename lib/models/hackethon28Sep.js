const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class MerakiHackathon28Sep extends ModelBase {
    static get tableName() {
        return 'merakihackthon';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            user_id: Joi.number(),
            email: Joi.string(),
            durations: Joi.number(),
            created_at: Joi.date(),
            // last_name: Joi.string().required(),
            // gender: Joi.string().required(),
            // country: Joi.string(),
            // password: Joi.string().required(),
            // user_id: Joi.string().required(),
        });
    }
};


// exports.up = async (knex) => {
//     await knex.schema.createTable('main.merakihackthon', (table) => {
//         table.increments().primary();
//         table.string('user_id').notNullable();
//         table.string('email').notNullable();
//         table.string('durations').notNullable();
//         table.datetime('created_at').notNullable();
//     });
// };
