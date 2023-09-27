exports.up = async (knex) => {
  await knex.schema.alterTable('assessment_outcome', (table) => {
    table.string('multiple_choise');
    table.integer('selected_option').nullable().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('assessment_outcome', (table) => {
    table.dropColumn('multiple_choise');
    table.dropColumn('selected_option').alter();
  });
};
