exports.up = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.string('course_type');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.dropColumn('course_type');
  });
};
