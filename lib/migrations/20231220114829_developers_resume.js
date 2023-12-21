exports.up = async (knex) => {
    await knex.schema.createTable('main.developers_resume', (table) => {
        table.increments('id').primary();
        table.string('name');
        table.string('email').unique();
        table.string('password');
        table.string('role');
        table.string('education');
        table.string('intrests');
        table.string('skills');
        table.string('experience');
        table.string('programming_languages');
        table.string('resonal_language');
        table.string('known_framworks');
        table.integer('learning_resource_id').references('id').inTable('main.learning_resources');
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.developers_resume');
};