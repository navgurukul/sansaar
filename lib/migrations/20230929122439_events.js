exports.up = async (knex) => {
    await knex.schema.createTable('main.events', (table) => {
        table.increments('id').primary();
        table.string('event_name');
        table.timestamp('start_time');
        table.timestamp('end_time');
        table.integer('durations');
        table.integer('user_id').references('id').inTable('main.user_hack').notNullable();
        table.string('user_ip')
        table.string('browser')
        table.string('os_info')
        table.string('page_title')
        table.string('page_url')
    });
};
exports.down = async (knex) => {
    await knex.schema.dropTable('main.events');
};