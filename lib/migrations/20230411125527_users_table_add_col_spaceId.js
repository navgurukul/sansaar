exports.up = function(knex) {
    return knex.schema.alterTable('main.users', function (table) {
      table.integer('space_id');
    //   table.foreign('space_id').references('partner_space.id');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.alterTable('main.users', function (table) {
    //   table.dropForeign('space_id');
      table.dropColumn('space_id');
    });
  };