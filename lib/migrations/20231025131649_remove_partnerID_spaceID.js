exports.up = function (knex) {
  return knex.schema.alterTable('main.classes', function (table) {
    table.dropColumn('space_id');
    table.dropColumn('partner_id');
  });
};

exports.down = function (knex) {};
