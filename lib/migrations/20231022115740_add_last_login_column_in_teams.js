exports.up = function (knex) {
  return knex.schema.table('main.c4ca_teams', function (table) {
    table.datetime('last_login');
  });
};

exports.down = function (knex) {
  return knex.schema.table('main.c4ca_teams', function (table) {
    table.dropColumn('last_login');
  });
};
