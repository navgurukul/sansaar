exports.up = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.string('region');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.recurring_classes', (table) => {
    table.dropColumn('region');
  });
};
