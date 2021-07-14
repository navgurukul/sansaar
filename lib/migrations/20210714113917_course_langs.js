exports.up = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.specificType('lang_available', 'TEXT[]');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.dropColumn('lang_available');
  });
};
