exports.up = async (knex) => {
    await knex.schema.createTable('main.meraki_certificate_v2', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('main.users')
      table.string('url');
      table.string('register_at');
      table.timestamp('created_at');
      table.integer('pathway_id');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('main.meraki_certificate_v2');
  };