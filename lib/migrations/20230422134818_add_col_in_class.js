exports.up = function(knex) {
    return knex.schema.alterTable('main.classes', function (table) {
      table.integer('space_id')
        .unsigned()
        .references('id')
        .inTable('main.partner_space')
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.alterTable('main.classes', function (table) {
      table.dropColumn('space_id');
    });
  };