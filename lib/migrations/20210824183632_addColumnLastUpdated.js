exports.up = async (knex) => {
  await knex.schema.alterTable('main.students', (table) => {
    table.datetime('last_updated');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.students', (table) => {
    table.dropColumn('last_updated');
  });
};
