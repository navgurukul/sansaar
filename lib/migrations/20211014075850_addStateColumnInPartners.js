/* eslint-disable */

exports.up = async (knex) => {
  await knex.schema.alterTable('partners', (table) => {
    table.string('state');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('partners', (table) => {
    table.dropColumn('state');
  });
};
