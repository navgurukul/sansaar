exports.up = async (knex) => {
  await knex.schema.alterTable('main.assessment_result', (table) => {
    table.integer('selected_option').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.assessment_result', (table) => {
    table.dropColumn('selected_option');
  });
};
