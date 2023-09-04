exports.up = async (knex) => {
    await knex.schema.createTable('main.gta_game', (table) => {
        table.increments().primary();
        table.string('first_name').notNullable();
        table.text('last_name').notNullable();
        table.string('gender').notNullable();
        table.string('country');
        table.string('password').notNullable();
        table.string('user_id').notNullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.gta_game');
};