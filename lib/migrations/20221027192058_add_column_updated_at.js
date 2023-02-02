exports.up = async (knex) => {
  await knex.schema.table('main.exercises_v2', (table) => {
    table.datetime('updated_at');
  });

  await knex.schema.table('main.assessment', (table) => {
    table.datetime('updated_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.exercises_v2', (table) => {
    table.dropColumn('updated_at');
  });
  await knex.schema.table('main.assessment', (table) => {
    table.dropColumn('updated_at');
  });
};
