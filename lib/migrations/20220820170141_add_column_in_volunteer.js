exports.up = async (knex) => {
  await knex.schema.alterTable('main.volunteer', (table) => {
    table.integer('hours_per_week');
    table.string('available_on_days');
    table.string('available_on_time');
  });
};
exports.down = async (knex) => {
  await knex.schema.alterTable('main.volunteer', (table) => {
    table.dropColumn('hours_per_week');
    table.dropColumn('available_on_days');
    table.dropColumn('available_on_time');
  });
};
