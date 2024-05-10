exports.up = function (knex) {
  return knex.schema.alterTable('main.space_group', function (table) {
    table.string('web_link');
    table.string('android_link');
    table.string('crca_link');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('main.space_group', function (table) {
    table.dropColumn('web_link');
    table.dropColumn('android_link');
    table.dropColumn('crca_link');
  });
};
