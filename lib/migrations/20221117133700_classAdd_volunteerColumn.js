/* eslint-disable */
exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.integer('volunteer_id').references('id').inTable('main.volunteer');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('volunteer_id');
  });
};
