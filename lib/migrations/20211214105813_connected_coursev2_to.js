exports.up = async (knex) => {
  // eslint-disable-next-line
  await knex.schema.alterTable('main.classes', (table) => {
    // Drop existing foreign key reference
    // table.dropForeign('exercise_id');
    // table.dropForeign('course_id');
    // Add new foreign key reference
    // table.foreign('exercise_id').references('id').inTable('main.exercises_v2');
    // table.foreign('course_id').references('id').inTable('main.courses_v2');
  });
};

exports.down = async (knex) => {
  // eslint-disable-next-line
  await knex.schema.alterTable('main.classes', (table) => {
    // table.dropForeign('exercise_id');
    // table.dropForeign('course_id');
    // table.foreign('exercise_id').references('id').inTable('main.exercises');
    // table.foreign('course_id').references('id').inTable('main.courses');
  });
};
