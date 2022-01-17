exports.up = async (knex) => {
  await knex.schema.createTable('main.partner_group_user', (table) => {
    table.increments().primary();
    table.integer('user_id');
    table.integer('partner_group_id').notNullable().references('id').inTable('main.partner_group');
    table.string('email');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.partner_group_user');
};
