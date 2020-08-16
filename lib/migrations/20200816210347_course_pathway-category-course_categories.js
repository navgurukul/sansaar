exports.up = async (knex) => {
  await knex.schema.table('main.pathway_courses', (table) => {
    table.increments().primary();
    table.integer('course_id').references('id').inTable('main.courses').notNullable();
    table.integer('pathway_id').references('id').inTable('main.pathways').notNullable();
    table.integer('sequence_num').unsigned().notNullable();
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
    table.integer('course_id').references('id').inTable('main.courses').notNullable();
    table.integer('category_id').notNullable();
    table.datetime('created_at').notNullable();
  });
};

// exports.down = async (knex) => {};
