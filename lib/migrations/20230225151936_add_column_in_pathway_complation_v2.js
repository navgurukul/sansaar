exports.up = async (knex) => {
  await knex.schema.table('main.pathway_completion_v2', (table) => {
    table.datetime('complete_at');
  });
  await knex.schema.table('main.course_completion_v2', (table) => {
    table.datetime('complete_at');
  });
  await knex.schema.table('main.exercise_completion_v2', (table) => {
    table.datetime('complete_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.pathway_completion_v2', (table) => {
    table.dropColumn('complete_at');
  });
  await knex.schema.table('main.course_completion_v2', (table) => {
    table.dropColumn('complete_at');
  });
  await knex.schema.table('main.exercise_completion_v2', (table) => {
    table.dropColumn('complete_at');
  });
};
