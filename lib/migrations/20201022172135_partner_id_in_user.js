exports.up = async (knex) => {
  await knex.schema.alterTable('main.users', (table) => {
    table.integer('partner_id').unsigned().references('id').inTable('main.partners').nullable();
    table.specificType('lang_1', 'char(2)');
    table.specificType('lang_2', 'char(2)');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.users', (table) => {
    table.dropColumn('partner_id');
    table.dropColumn('lang_1');
    table.dropColumn('lang_2');
  });
};
