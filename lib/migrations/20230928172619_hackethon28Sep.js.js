exports.up = async (knex) => {
    await knex.schema.createTable('main.merakihackthon', (table) => {
        table.increments().primary();
        // table.string('user_id').notNullable();
        table.integer('user_id').unique().unsigned().references('id').inTable('main.users').notNullable();
        table.string('email').notNullable();
        table.integer('durations').notNullable();
        table.datetime('created_at').notNullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.merakihackthon');
};
