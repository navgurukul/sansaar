// length 7

exports.up = async (knex) => {
  await knex.schema.alterTable('users', (table) => {
    table.string('mode');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('mode');
  });
};
