exports.up = async (knex) => {
  await knex.schema.createTable('main.chanakya_user_roles', (table) => {
    table.increments();
    table.integer('chanakya_user_email_id').notNullable();
    table.integer('roles').references('id').inTable('main.chanakya_roles');
    table.integer('privilege').references('id').inTable('main.chanakya_privilege');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.chanakya_user_roles');
};
