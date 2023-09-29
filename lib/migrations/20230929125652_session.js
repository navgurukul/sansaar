exports.up = async (knex) => {
    await knex.schema.createTable('main.session', (table) => {
        table.increments('id').primary();
        table.string('session_name');
        table.timestamp('start_time');
        table.timestamp('end_time');
        table.integer('durations');
        table.integer('user_id').references('id').inTable('main.user_hack').notNullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.session');
};
