exports.up = async (knex) => {
    await knex.schema.createTable('meraki_students', (table) => {
        table.increments('id').primary();
        table.string('student_iD').notNullable().unique();
        table.string('name').notNullable();
        table.string('password').notNullable();
        table.integer('partner_id').unsigned().notNullable().references('id').inTable('partners').onDelete('CASCADE');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('meraki_students');
};