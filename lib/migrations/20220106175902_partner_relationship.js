exports.up = async (knex) => {
  await knex.schema.createTable('main.partner_relationship', (table) => {
    table.increments().primary();
    table.integer('partner_id').notNullable();
    table.integer('partner_group_id').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.partner_relationship');
};
