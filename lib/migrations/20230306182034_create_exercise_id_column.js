exports.up = async (knex) => {
  await knex.schema.table('main.exercise_completion_v2', (table) => {
    table.dropColumn('exercise_id');
    table.integer('exercise_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.exercise_completion_v2', (table) => {
    table.dropColumn('exercise_id');
    table.integer('exercise_id').unique();
  });
};
