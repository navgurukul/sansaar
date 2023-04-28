exports.up = function(knex) {
    return knex.schema.alterTable('main.classes', function (table) {
      table.integer('space_id')
        .unsigned()
        .references('id')
        .inTable('main.partner_space')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.alterTable('main.classes', function (table) {
      table.dropColumn('space_id');
    });
  };