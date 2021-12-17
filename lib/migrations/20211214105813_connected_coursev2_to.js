exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('exercise_id');
    table.dropColumn('course_id');
    table.integer('exercise_id').references('id').inTable('main.exercises_v2');
    table.integer('course_id').references('id').inTable('main.courses_v2');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('exercise_id');
    table.dropColumn('course_id');
    table.integer('exercise_id').references('id').inTable('main.exercises');
    table.integer('course_id').references('id').inTable('main.courses');
  });
};
