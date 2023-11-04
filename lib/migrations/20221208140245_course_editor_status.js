exports.up = async (knex) => {
  await knex.schema.createTable('main.course_editor_status', (table) => {
    table.increments('id').primary();
    table.integer('course_id').references('id').inTable('courses_v2');
    table.string('course_states');
    table.datetime('stateChangedate');
    table.integer('content_editors_user_id').references('id').inTable('users');
  });
};
exports.down = async (knex) => {
  await knex.schema.dropTable('main.course_editor_status');
};
