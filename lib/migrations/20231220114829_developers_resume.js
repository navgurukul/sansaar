exports.up = async (knex) => {
    await knex.schema.createTable('main.developers_resume', (table) => {
        table.increments().primary();
        table.string('name');
        table.string('email').unique();
        table.string('role');
        table.string('education');
        table.string('skills');
        table.string('experience');
        table.string('programming_languages');
        table.string('resonal_language');
        table.integer('learning_resource_id').references('id').inTable('main.learning_resources');
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.developers_resume');
};