exports.up = async (knex) => {
  await knex.schema.alterTable('main.learning_track_status', (table) => {
    table.integer('exercise_id').references('id').inTable('main.exercises_v2').notNullable();
    table.dropColumn('course_index');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.learning_track_status', (table) => {
    table.dropColumn('exercise_id');
    table.integer('course_index');
  });
};
