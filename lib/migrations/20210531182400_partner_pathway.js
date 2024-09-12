exports.up = async (knex) => {
  await knex.schema.createTable('main.partner_pathways', (table) => {
    table.increments();
    table.integer('partner_id').unsigned().references('id').inTable('main.partners').notNullable();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.partner_pathways');
};
