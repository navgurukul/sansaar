exports.up = async (knex) => {
  await knex.schema.createTable('main.partner_group', (table) => {
    table.increments().primary();
    table.string('name').notNullable();
    table.specificType('partners', 'TEXT[]');
    table.specificType('subgroups', 'TEXT[]');
    table.specificType('emails', 'TEXT[]');
    table.datetime('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.partner_group');
};
