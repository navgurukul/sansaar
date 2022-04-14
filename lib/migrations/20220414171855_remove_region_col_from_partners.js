exports.up = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.dropColumn('region');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.string('region');
  });
};
