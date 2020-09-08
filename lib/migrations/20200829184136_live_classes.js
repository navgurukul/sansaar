exports.up = async (knex) => {
  await knex.schema.createTable('main.classes', (table) => {
    table.increments().primary();
    table.string('title', 45).notNullable();
    table.string('description');
    table.integer('facilitator_id').unsigned().notNullable();
    table.datetime('start_time').notNullable();
    table.datetime('end_time').notNullable();
    table.integer('exercise_id').references('id').inTable('main.exercises');
    table.integer('course_id').references('id').inTable('main.courses');
    table.integer('category_id').references('id').inTable('main.category').notNullable();
    table.string('video_id', 45);
  });
};

// eslint-disable-next-line
exports.down = async (knex, Promise) => {
  await knex.schema.dropTable('main.classes');
};

// rename name to title and live_classes to classes, convert camel to snake in payload
