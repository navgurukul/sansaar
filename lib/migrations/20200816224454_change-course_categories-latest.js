exports.up = async (knex) => {
  await knex.schema.createTable('main.course_categories', (table) => {
    table.increments().primary();
    table.integer('course_id').unsigned().references('id').inTable('main.courses').notNullable();
    table.integer('category_id').unsigned().references('id').inTable('main.category').notNullable();
    table.datetime('created_at').notNullable();
  });
};

// eslint-disable-next-line
exports.down = async (knex) => {
  await knex.schema.table('main.course_categories', (table) => {
    table.dropTable('main.course_categories');
  });
};
