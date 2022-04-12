exports.up = async (knex) => {
  await knex.schema.table('main.classes', (table) => {
    table.string('course_version');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.classes', (table) => {
    table.dropColumn('course_version');
  });
};
