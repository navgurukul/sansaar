exports.up = async (knex) => {
    await knex.schema.createTable('main.hackathon_questions', (table) => {
        table.increments('id').primary();
        table.string('email').notNullable();
        table.string('questions', 500).notNullable();
    });
};
exports.down = async (knex) => {
    await knex.schema.dropTable('main.hackathon_questions');
};



