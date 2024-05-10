exports.up = async (knex) => {
  await knex.schema.alterTable('main.stage_transitions', (table) => {
    table.string('transition_done_by');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.stage_transitions', (table) => {
    table.dropColumn('transition_done_by');
  });
};
