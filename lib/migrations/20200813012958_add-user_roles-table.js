exports.up = async (knex) => {
  await knex.schema.createTable('main.sansaar_user_roles', (table) => {
    table.increments();
    table.integer('user_id').unsigned().references('id').inTable('main.users').notNullable();
    table.string('role');
    table.datetime('createdAt');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.sansaar_user_roles');
};
