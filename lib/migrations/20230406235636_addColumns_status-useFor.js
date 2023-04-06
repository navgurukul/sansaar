exports.up = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.string('status');
      table.string('use_for');
      table.string('contact_name');
      table.string('location');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.dropColumn('status');
      table.dropColumn('use_for');
      table.dropColumn('contact_name');
      table.dropColumn('location');
    });
  };
  