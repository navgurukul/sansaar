exports.up = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teachers', (table) => {
      table.string('profile_image_url'); 
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teachers', (table) => {
      table.dropColumn('profile_image_url'); // No .notNullable() here
    });
  };
  