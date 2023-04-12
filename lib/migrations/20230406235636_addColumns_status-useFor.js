exports.up = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.string('platform');
      table.string('point_of_contact_name');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.dropColumn('platform');
      table.dropColumn('point_of_contact_name');
    });
  };
  