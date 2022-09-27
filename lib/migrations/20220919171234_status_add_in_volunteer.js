exports.up = async (knex) => {
  await knex.schema.alterTable('main.volunteer', (table) => {
    table.string('status');
  });
};
exports.down = async (knex) => {
  await knex.schema.alterTable('main.volunteer', (table) => {
    table.dropColumn('status');
  });
};
