exports.up = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teachers', (table) => {
      table.string('state');
      table.string('district');
      table.string('school');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teachers', (table) => {
      table.dropColumn('state');
      table.dropColumn('district');
      table.dropColumn('school');
    });
  };
  