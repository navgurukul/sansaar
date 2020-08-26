exports.up = async (knex) => {
  await knex.schema.createTable('main.mentor_tree', (table) => {
    table.increments();
    table.integer('mentor_id').unsigned().references('id').inTable('main.users').notNullable();
    table.integer('mentee_id').unsigned().references('id').inTable('main.users').notNullable();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
    table.datetime('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.mentor_tree');
};
