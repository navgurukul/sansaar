exports.up = async (knex) => {
    await knex.schema.createTable('main.events', (table) => {
        table.increments('id').primary();
        table.string('event_name');
        table.timestamp('start_time');
        table.timestamp('end_time');
        table.integer('durations');  
        table.integer('view_page_id').references('id').inTable('main.view_page').notNullable();
        table.integer('session_id').references('id').inTable('main.session').notNullable();
        table.integer('user_id').references('id').inTable('main.user_hack').notNullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.events');
};
