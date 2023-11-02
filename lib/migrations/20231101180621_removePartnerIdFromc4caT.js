exports.up = function(knex) {
    return knex.schema.alterTable('main.c4ca_teachers', function (table) {
        table.dropColumn('partner_id');

    });
  };

  exports.down = function(knex) {
    return knex.schema.alterTable('main.c4ca_teachers', function (table) {
        table.integer('partner_id');
    });
  };