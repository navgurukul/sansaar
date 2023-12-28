exports.up = async (knex) => {
    await knex.schema.createTable('main.hackathon_courses', (table) => {
        table.increments('id').primary();
        table.string('email').notNullable();
        table.integer('course_id').notNullable();
        table.integer('exercise_id');
        table.string('progress');
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.hackathon_courses');
};
