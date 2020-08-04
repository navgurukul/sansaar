exports.up = async (knex) => {
  await knex.schema.table('main.user_roles', (table) => {
    table.string('role').after('roles');
    table.datetime('createdAt').after('center');
  });
  await knex('main.user_roles').update({
    createdAt: new Date(),
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.user_roles', (table) => {
    table.dropColumn('createdAt');
    table.dropColumn('role');
  });
};
