exports.up = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.string('platform');
      table.string('point_of_contact_name');
      table.enum('status', ['Newly Onboarded', 'Active', 'Inactive', 'Archived']).notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
      table.dropColumn('platform');
      table.dropColumn('point_of_contact_name');
      table.dropColumn('status');
      table.dropColumn('createdAt');
      table.dropColumn('updatedAt');
    });
  };
  