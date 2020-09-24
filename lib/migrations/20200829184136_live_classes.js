exports.up = async (knex) => {
  await knex.schema.createTable('main.classes', (table) => {
    table.increments().primary();
    table.string('title', 45).notNullable();
    table.string('description');
    table.integer('facilitator_id').unsigned().notNullable();
    table.datetime('start_time').notNullable();
    table.datetime('end_time').notNullable();
    table.integer('exercise_id').references('id').inTable('main.exercises');
    table.integer('course_id').references('id').inTable('main.courses');
    table.integer('category_id').references('id').inTable('main.category').notNullable();
    table.string('video_id', 45);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.classes');
};
