exports.up = async (knex) => {
  await knex.schema.alterTable('students', (table) => {
    table.string('evaluation');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('students', (table) => {
    table.dropColumn('evaluation');
  });
};
