exports.up = async (knex) => {
  await knex.schema.table('main.users', (table) => {
    table.datetime('createdAt').after('linkedin_link');
  });
  await knex('main.users').update({
    createdAt: new Date(),
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.users', (table) => {
    table.dropColumn('createdAt');
  });
};
