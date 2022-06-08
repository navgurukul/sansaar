exports.up = async (knex) => {
  await knex.schema.alterTable('main.class_registrations', (table) => {
    table.boolean('google_registration_status');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.class_registrations', (table) => {
    table.dropColumn('google_registration_status');
  });
};
