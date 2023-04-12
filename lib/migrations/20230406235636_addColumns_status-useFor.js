exports.up = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.string('status');
      table.string('platform');
      table.string('point_of_contact_name');
      // table.string('space_id')
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.dropColumn('status');
      table.dropColumn('platform');
      table.dropColumn('point_of_contact_name');
      // table.dropColumn('space_id')
    });
  };
  