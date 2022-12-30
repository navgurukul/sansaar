exports.up = async (knex) => {
  await knex.schema.alterTable('main.scratch', (table) => {
    table.integer('userId_scratch');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.scratch', (table) => {
    table.dropColumn('userId_scratch');
  });
};
