exports.up = async (knex) => {
    await knex.schema.createTable('main.user_hack', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').notNullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.user_hack');
};
