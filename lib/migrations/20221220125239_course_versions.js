exports.up = async (knex) => {
  await knex.schema.createTable('main.course_versions', (table) => {
    table.increments().primary();
    table.integer('course_id').references('id').inTable('main.courses_v2');
    table.string('version');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.course_versions');
};
