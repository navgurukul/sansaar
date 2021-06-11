exports.up = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.string('meraki_link');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.dropColumn('meraki_link');
  });
};
