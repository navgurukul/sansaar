exports.up = function (knex) {
  return knex.schema.alterTable('main.partner_specific_batches', function (table) {
    table
      .integer('space_id')
      .unsigned()
      .references('id')
      .inTable('main.partner_space')
      .onDelete('set null');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('main.partner_specific_batches', function (table) {
    table.dropColumn('space_id');
  });
};
