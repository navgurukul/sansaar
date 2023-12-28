exports.up = async (knex) => {
    await knex.schema.createTable('main.hackathon_answers', (table) => {
        table.increments('id').primary();
        table.integer('question_id').references('id').inTable('main.hackathon_questions').notNullable();
        table.string('answers', 500).notNullable();
        table.string('email');
    });
};
exports.down = async (knex) => {
    await knex.schema.dropTable('main.hackathon_answers');
};
