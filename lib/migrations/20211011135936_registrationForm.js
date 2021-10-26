/* eslint-disable */

exports.up = async (knex) => {
  await knex.schema.createTable('main.registration_form_structure', (table) => {
    table.increments();
    table
      .integer('partner_id')
      .unique()
      .unsigned()
      .references('id')
      .inTable('main.partners')
      .notNullable();
    table.json('form_structure');
  });
  await knex.schema.createTable('main.registration_form_data', (table) => {
    table.increments();
    table
      .integer('partner_id')
      .unique()
      .unsigned()
      .references('id')
      .inTable('main.partners')
      .notNullable();
    table.json('form_data');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.registration_form_structure');
  await knex.schema.dropTable('main.registration_form_data');
};
