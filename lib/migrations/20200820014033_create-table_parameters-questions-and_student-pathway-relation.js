exports.up = async (knex) => {
  await knex.schema.createTable('main.progress_parameters', (table) => {
    table.increments();
    table.string('type', 10).notNullable();
    table.integer('min_range');
    table.integer('max_range');
    table.datetime('created_at');
  });
  await knex.schema.createTable('main.progress_questions', (table) => {
    table.increments();
    table.string('type', 10).notNullable();
    table.datetime('created_at');
  });
  await knex.schema.createTable('main.student_pathways', (table) => {
    table.increments();
    table.integer('user_id').unsigned().references('id').inTable('main.users').notNullable();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.progress_paramters');
  await knex.schema.dropTable('main.progress_questions');
  await knex.schema.droptable('main.student_pathways');
};
