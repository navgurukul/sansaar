exports.up = async (knex) => {
    await knex.schema.createTable('main.learning_progress', (table) => {
        table.increments('id').primary();
        table.integer('developers_resume_id').references('id').inTable('main.developers_resume').notNullable();
        table.integer('learning_resource_id').references('id').inTable('main.learning_resources').notNullable();
        table.boolean('completed').defaultTo(false);
        table.datetime('created_at');
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.learning_progress');
};