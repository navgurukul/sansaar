exports.up = async (knex) => {
  await knex.schema.createTable('main.chanakya_user_roles', (table) => {
    table.increments();
    table.integer('user_id').unsigned().references('id').inTable('c_users')
      .notNullable();
    table.string('role').unique();
    table.datetime('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.chanakya_user_roles');
};
