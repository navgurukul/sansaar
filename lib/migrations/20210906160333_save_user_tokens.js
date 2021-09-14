exports.up = async (knex) => {
  await knex.schema.createTable('main.user_tokens', (table) => {
    table.increments();
    table
      .integer('user_id')
      .unique()
      .unsigned()
      .references('id')
      .inTable('main.users')
      .notNullable();
    table.string('user_email').unique().references('email').inTable('main.users').notNullable();
    table.string('access_token').notNullable();
    table.string('refresh_token').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.user_tokens');
};
