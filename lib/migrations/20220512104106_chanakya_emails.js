exports.up = async (knex) => {
  await knex.schema.createTable('main.chanakya_user_email', (table) => {
    table.increments();
    table.string('email').notNullable().unique();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.chanakya_user_email');
};
