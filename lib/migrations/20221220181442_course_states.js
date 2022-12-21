exports.up = async (knex) => {
  await knex.schema.createTable('course_states', (table) => {
    table.increments().primary();
    table.integer('state_id').references('id').inTable('main.courses_v2');
    table.string('state_name');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('course_states');
};
