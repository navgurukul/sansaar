exports.up = async (knex) => {
    await knex.schema.createTable('main.c4ca_partners', (table) => {
        table.increments().primary();
        table.string('name').notNullable();
        table.string('point_of_contact');
        table.string('email').notNullable();
        table.string('phone_number');
        table.string('status');
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.c4ca_partners');
};