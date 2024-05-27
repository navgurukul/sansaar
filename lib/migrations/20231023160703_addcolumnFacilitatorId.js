exports.up = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teachers', (table) => {
      table.integer('facilitator_id').references('id').inTable('main.facilitators');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teachers', (table) => {
      table.dropColumn('facilitator_id');
    });
  };
  