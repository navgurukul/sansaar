exports.up = async (knex) => {
  await knex.schema.withSchema('main').createTable('user_session', (table) => {
    table.string('id').primary();
    // Add other columns as needed
  });
};

exports.down = async (knex) => {
  await knex.schema.withSchema('main').dropTable('user_session');
};
