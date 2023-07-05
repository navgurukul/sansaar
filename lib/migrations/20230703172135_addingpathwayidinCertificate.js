exports.up = async (knex) => {
    await knex.schema.alterTable('main.meraki_certificate ', (table) => {
      table.integer('pathway_id');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.meraki_certificate ', (table) => {
      table.dropColumn('pathway_id');
    });
  };

