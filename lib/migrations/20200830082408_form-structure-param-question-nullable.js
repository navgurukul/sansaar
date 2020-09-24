exports.up = async (knex) => {
  await knex.schema.table('main.pathway_tracking_form_structure', (table) => {
    table.integer('parameter_id').unsigned().alter();
    table.integer('question_id').unsigned().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.pathway_tracking_form_structure', (table) => {
    table.integer('parameter_id').unsigned().notNullable().alter();
    table.integer('question_id').unsigned().notNullable().alter();
  });
};
