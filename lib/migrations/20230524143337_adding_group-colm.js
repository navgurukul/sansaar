exports.up = function (knex) {
  return knex.schema.alterTable('main.users', function (table) {
    table
      .integer('group_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('main.space_group')
      .onDelete('set null');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('main.users', function (table) {
    table.dropColumn('group_id');
  });
};
