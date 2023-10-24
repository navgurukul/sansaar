exports.up = async (knex) => {
    await knex.schema.alterTable('main.pathway_completion_v2', (table) => {
    //   table.integer('pathway_id')
      table.dropColumn('pathway_id');

    })

  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.pathway_completion_v2', (table) => {
        table.integer('pathway_id')
    });
  };