exports.up = function(knex) {
    return knex.schema.alterTable('main.partner_specific_batches', function (table) {
      table.integer('group_id')
        .unsigned()
        .references('id')
        .inTable('main.space_group')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    });
  };

  exports.down = function(knex) {
    return knex.schema.alterTable('main.partner_specific_batches', function (table) {
      table.dropColumn('group_id');
    });
  };