exports.up = async (knex, Promise) => {
  await knex.schema.table('main.classes', (table) => {
    table.string('course_version');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.table('main.classes', (table) => {
    table.dropColumn('version');
  });
};