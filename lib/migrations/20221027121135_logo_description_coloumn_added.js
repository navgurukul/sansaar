exports.up = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.string('partner_logo');
    table.string('partner_description');
  });
};
exports.down = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.dropColumn('partner_logo');
    table.dropColumn('partner_description');
  });
};
