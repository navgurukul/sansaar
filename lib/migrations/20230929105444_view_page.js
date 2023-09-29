exports.up = async (knex) => {
    await knex.schema.createTable('main.view_page', (table) => {
        table.increments().primary();
        table.integer('user_id').references('id').inTable('main.users').notNullable();
        table.integer('durations').notNullable();
        table.timestamp('created_at').defaultTo(knex.raw('CURRENT_TIMESTAMP'));
        table.string('page_url')
        table.string('page_title')

    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.view_page');
};
