exports.up = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.string('referred_by');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.dropColumn('referred_by');
  });
};
