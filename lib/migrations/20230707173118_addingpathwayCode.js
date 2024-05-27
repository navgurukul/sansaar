exports.up = async (knex) => {
      await knex.schema.alterTable('main.meraki_certificate ', (table) => {
        table.string('pathway_code');
      });
    };
    
    exports.down = async (knex) => {
      await knex.schema.alterTable('main.meraki_certificate ', (table) => {
        table.dropColumn('pathway_code');
      });
      await knex.schema.alterTable('main.meraki_certificate ', (table) => {
        table.dropColumn('pathway_id');
      });

    };
  
  