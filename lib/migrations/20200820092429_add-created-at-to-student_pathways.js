exports.up = async (knex) => {
  await knex.schema.table('main.student_pathways', (table) => {
    table.datetime('created_at').after('pathway_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.student_pathways', (table) => {
    table.dropColumn('created_at');
  });
};
