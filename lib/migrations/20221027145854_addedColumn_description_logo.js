exports.up = async (knex) => {
  await knex.schema.table('main.partners', (table) => {
    table.string('partner_discription');
    table.string('partner_logo');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.partners', (table) => {
    table.dropColumn('partner_discription');
    table.dropColumn('partner_logo');
  });
};
