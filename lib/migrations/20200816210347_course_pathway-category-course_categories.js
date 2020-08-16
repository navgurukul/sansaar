exports.up = async (knex) => {
  await knex.schema.table('main.course_pathways', (table) => {
    table.increments().primary();
    table.integer('course_id').notNullable();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
    table
      .integer('sequence_num')
      .unsigned()
      .references('sequence_num')
      .inTable('main.exercises')
      .notNullable();
    table.datetime('created_at').notNullable();
    table.datetime('updated_at').notNullable();
  });

  await knex.schema.table('main.category', (table) => {
    table.increments().primary();
    table.string('category_name', 100).notNullable();
    table.datetime('created_at').notNullable();
  });

  await knex.schema.table('main.course_categories', (table) => {
    table.increments().primary();
    table
      .integer('course_id')
      .references('course_id')
      .inTable('main.course_pathways')
      .notNullable();
    table.integer('category_id');
    table.datetime('created_at');
  });
};

// exports.down = async (knex) => {};
