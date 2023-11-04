exports.up = async (knex) => {
  await knex.schema.createTable('main.c4ca_roles', (table) => {
    table.increments().primary();
    table.string('role').notNullable();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.datetime('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.c4ca_roles');
};
