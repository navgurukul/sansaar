exports.up = async (knex) => {
  await knex.schema.alterTable('main.exercise_completion_v2', (table) => {
    table.integer('exercise_id').alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.exercise_completion_v2', (table) => {
    table.integer('exercise_id').unique().alter();
  });
};
