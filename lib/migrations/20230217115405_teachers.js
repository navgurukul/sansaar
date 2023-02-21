const { includes } = require("lodash");

exports.up = async (knex) => {
    await knex.schema.createTable('main.teacher_registration',(table)=>{
        table.increments('id').primary();
        table.string('name');
        table.string('email');
        table.integer('contact_no');
        // table.integer('partner_id').unsigned().references('partner_id').inTable('main.users');
    })
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.teacher_registration');
};

