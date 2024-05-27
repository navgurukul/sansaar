exports.up = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.string('platform');
      table.string('point_of_contact_name');
      table.enum('status', ['Newly Onboarded', 'Active', 'Inactive', 'Archived','Re Onboarded']);
      table.timestamp('updated_at');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.dropColumn('platform');
      table.dropColumn('point_of_contact_name');
      table.dropColumn('status');
      table.dropColumn('updated_at');
    });
  };
  