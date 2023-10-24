exports.up = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teams', (table) => {
      table.string('state');
      table.string('district');
      table.string('school');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teams', (table) => {
      table.dropColumn('state');
      table.dropColumn('district');
      table.dropColumn('school');
    });
  };
  