exports.up = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.specificType('districts', 'TEXT[]');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.dropColumn('districts');
  });
};
