exports.up = async (knex) => {
  await knex.schema.alterTable('main.c4ca_students', function (table) {
    table.datetime('created_at');
  });
  await knex.schema.alterTable('main.c4ca_partners', (table) => {
    table.datetime('created_at');
  });
  await knex.schema.alterTable('main.c4ca_teachers', (table) => {
    table.datetime('created_at');
  });
  await knex.schema.alterTable('main.facilitators', (table) => {
    table.datetime('created_at');
  });
};
exports.down = async (knex) => {
  await knex.schema.alterTable('main.c4ca_students', function (table) {
    table.dropColumn('created_at');
  });
  await knex.schema.alterTable('main.c4ca_partners', function (table) {
    table.dropColumn('created_at');
  });
  await knex.schema.alterTable('main.c4ca_teachers', function (table) {
    table.dropColumn('created_at');
  });
  await knex.schema.alterTable('main.facilitators', function (table) {
    table.dropColumn('created_at');
  });
};





