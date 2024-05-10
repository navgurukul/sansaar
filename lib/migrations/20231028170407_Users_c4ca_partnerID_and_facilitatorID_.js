exports.up = function (knex) {
  return knex.schema.alterTable('main.users', function (table) {
    table
      .integer('c4ca_partner_id')
      .unsigned()
      .references('id')
      .inTable('main.c4ca_partners')
      .onDelete('set null');

    table
      .integer('c4ca_facilitator_id')
      .unsigned()
      .references('id')
      .inTable('main.facilitators')
      .onDelete('set null');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('main.users', function (table) {
    table.dropColumn('c4ca_partner_id');
    table.dropColumn('c4ca_facilitator_id');
  });
};
