exports.up = async (knex) => {
  await knex.schema.createTable('main.partner_user', (table) => {
    table.increments();
    table.integer('partner_id').references('id').inTable('main.partners');
    table.string('email', 225);
    table.datetime('created_at').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.partner_user');
};
