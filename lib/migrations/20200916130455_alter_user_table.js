exports.up = async (knex) => {
  await knex.schema.alterTable('main.users', (table) => {
    table.string('chat_id');
    table.string('chat_password', 32);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.users', (table) => {
    table.dropColumn('chat_id');
    table.dropColumn('chat_password');
  });
};
