exports.up = async (knex) => {
  await knex.schema.alterTable('students', (table) => {
    table.string('district');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('students', (table) => {
    table.dropColumn('district');
  });
};
