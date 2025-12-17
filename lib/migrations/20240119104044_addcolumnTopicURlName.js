exports.up = async (knex) => {
    await knex.schema.alterTable('main.c4ca_team_projecttopic', (table) => {
      table.string('projectTopic_file_name');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.c4ca_team_projecttopic', (table) => {
      table.dropColumn('projectTopic_file_name');
    });
  };