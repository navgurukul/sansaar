exports.up = async (knex) => {
    await knex.schema.createTable('main.learning_resources', (table) => {
        table.increments().primary();
        table.string('course_name').notNullable();
        table.string('course_url').notNullable();
        table.string('course_description');
        table.string('course_category');
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.learning_resources');
};