/* eslint-disable */

exports.up = async (knex) => {
  await knex.schema.alterTable('c_users', (table) => {
    table.integer('partner_id').unsigned().references('id').inTable('main.partners');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('c_users', (table) => {
    table.dropColumn('partner_id');
  });
};
