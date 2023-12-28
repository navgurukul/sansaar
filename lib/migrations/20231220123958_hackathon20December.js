exports.up = async (knex) => {
    await knex.schema.createTable('main.hackathon_login', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').notNullable();
        table.string('password').notNullable();
    });
};
exports.down = async (knex) => {
    await knex.schema.dropTable('main.hackathon_login');
};
