exports.up = async (knex) => {
  await knex.schema.alterTable('main.volunteer', (table) => {
    table.string('manual_status');
  });
};
exports.down = async (knex) => {
  await knex.schema.alterTable('main.volunteer', (table) => {
    table.dropColumn('manual_status');
  });
};
