exports.up = async (knex) => {
  await knex.schema.alterTable('main.scratch', (table) => {
    // add team_id column.
    table.integer('team_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.scratch', (table) => {
    // remove team_id column.
    table.dropColumn('team_id');
  });
};
