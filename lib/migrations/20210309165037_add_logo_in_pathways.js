exports.up = async (knex) => {
  await knex.schema.alterTable('main.pathways', (table) => {
    table.string('logo').after('name');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.pathways', (table) => {
    table.dropColumn('logo');
  });
};
