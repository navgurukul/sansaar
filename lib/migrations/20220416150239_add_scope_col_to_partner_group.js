exports.up = async (knex) => {
  await knex.schema.alterTable('main.partner_group', (table) => {
    table.string('scope');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.partner_group', (table) => {
    table.dropColumn('scope');
  });
};
