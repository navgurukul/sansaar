exports.up = async (knex) => {
  await knex.schema.createTable('course_transitions', (table) => {
    table.increments().primary();
    table.integer('course_version_id').references('id').inTable('main.courses_v2');
    table.string('state');
    table.integer('user_is');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('course_transitions');
};
