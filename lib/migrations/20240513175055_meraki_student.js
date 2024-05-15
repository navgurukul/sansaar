exports.up = async (knex) => {
    await knex.schema.createTable('main.meraki_students', (table) => {
        table.increments('id').primary();
        table.string('login_id').unique().notNullable()
        table.string('name').notNullable();
        table.string('password').notNullable();
        table.integer('partner_id').unsigned().notNullable().references('id').inTable('partners').onDelete('CASCADE');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.meraki_students');
};