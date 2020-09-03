exports.up = async (knex) => {
  await knex.schema.createTable('main.pathway_courses', (table) => {
    table.increments().primary();
    table.integer('course_id').unsigned().references('id').inTable('main.courses').notNullable();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
    table.integer('sequence_num').unsigned().notNullable();
    table.datetime('created_at').notNullable();
    table.datetime('updated_at').notNullable();
  });

  await knex.schema.createTable('main.category', (table) => {
    table.increments().primary();
    table.string('category_name', 100).notNullable();
    table.datetime('created_at').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.pathway_courses');
  await knex.schema.dropTable('main.category');
};
