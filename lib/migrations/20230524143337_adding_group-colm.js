exports.up = function(knex) {
    return knex.schema.alterTable('main.users', function (table) {
      table.integer('group_id')
        .unsigned()
        .references('id')
        .inTable('main.space_group')
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.alterTable('main.users', function (table) {
      table.dropColumn('group_id');
    });
  };