exports.up = async (knex) => {
  await knex.schema.createTable('main.pathways', (table) => {
    table.increments();
    table.string('code', 6).unique().notNullable();
    table.string('name', 45).notNullable();
    table.string('description', 5000).notNullable();
    table.datetime('createdAt').notNullable();
  });

  await knex.schema.createTable('main.pathway_milestones', (table) => {
    table.increments();
    table.string('name', 45).notNullable();
    table.string('description', 5000).notNullable();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
    table.integer('position').unsigned().notNullable();
    table.datetime('createdAt').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.pathway_milestones').dropTable('main.pathways');
};
