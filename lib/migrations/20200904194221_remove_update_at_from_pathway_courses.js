exports.up = async (knex) => {
  await knex.schema.alterTable('main.pathway_courses', (table) => {
    table.dropColumn('updated_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.pathway_courses', (table) => {
    table.datetime('updated_at');
  });
};
