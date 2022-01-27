exports.up = async (knex) => {
  await knex.schema.createTable('main.partner_group_relationship', (table) => {
    table.increments().primary();
    table.integer('partner_group_id').notNullable().references('id').inTable('main.partner_group');
    table.integer('member_of').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.partner_group_relationship');
};
