exports.up = async (knex) => {
  await knex.schema.alterTable('main.exercise_completion_v2', (table) => {
    table.integer('slug_id');
    table.integer('course_id');
    table.string('lang');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.exercise_completion_v2', (table) => {
    table.dropColumn('slug_id');
    table.dropColumn('course_id');
    table.dropColumn('lang');
    table.dropColumn('updated_at');
  });
};
