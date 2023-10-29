exports.up = async (knex) => {
  await knex.schema.alterTable('main.c4ca_teachers', (table) => {
    table.string('profile_url');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.c4ca_teachers', (table) => {
    table.dropColumn('profile_url');
  });
};
