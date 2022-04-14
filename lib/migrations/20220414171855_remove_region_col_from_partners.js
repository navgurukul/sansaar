exports.up = async (knex, Promise) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.dropColumn('region');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.string('region');
  });
};
