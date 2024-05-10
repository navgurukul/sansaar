exports.up = async (knex) => {
  await knex.schema.alterTable('main.c4ca_team_projectsubmit_solution', (table) => {
    table.string('project_file_name');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.c4ca_team_projectsubmit_solution', (table) => {
    table.dropColumn('project_file_name');
  });
};
