exports.up = async (knex) => {
    await knex.schema.createTable('main.english_ai_content', (table) => {
        table.increments().primary();
        table.string('title').notNullable();
        table.text('content').notNullable();
        table.integer('level').notNullable();
        table.string('link');
    });
    await knex.schema.createTable('main.english_ai_history', (table) => {
        table.increments().primary();
        table.integer('user_id').references('id').inTable('main.users').notNullable();
        table.integer('english_ai_id').references('id').inTable('main.english_ai_content').notNullable();
        table.datetime('createdAt').notNullable();

    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.english_ai_content').dropTable('main.english_ai_history');
};
