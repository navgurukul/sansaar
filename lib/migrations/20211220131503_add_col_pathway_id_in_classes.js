exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.integer('pathway_id').references('id').inTable('main.pathways_v2');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('pathway_id');
  });
};
