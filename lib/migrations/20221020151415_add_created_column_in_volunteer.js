exports.up = async (knex) => {
  await knex.schema.table('main.volunteer', (table) => {
    table.datetime('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.volunteer', (table) => {
    table.dropColumn('created_at');
  });
};
