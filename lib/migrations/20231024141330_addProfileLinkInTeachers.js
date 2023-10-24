exports.up = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teachers', (table) => {
      table.string('profile_link');
    });
    await knex.schema.alterTable('main.pathway_completion_v2', (table) => {
      table.integer('pathway_id').unUnique().alter();
    })

  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.c4ca_teachers', (table) => {
      table.dropColumn('profile_link');
    });
    await knex.schema.alterTable('main.pathway_completion_v2', (table) => {
      table.integer('pathway_id').alter();
    });
  };