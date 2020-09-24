exports.up = async (knex) => {
  await knex.schema.createTable('main.pathway_tracking_form_structure', (table) => {
    table.increments();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
    table
      .integer('parameter_id')
      .unsigned()
      .references('id')
      .inTable('main.progress_parameters')
      .notNullable();
    table
      .integer('question_id')
      .unsigned()
      .references('id')
      .inTable('main.progress_questions')
      .notNullable();
    table.datetime('created_at').notNullable();
  });
  await knex.schema.createTable('main.pathway_tracking_request', (table) => {
    table.increments();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
    table.integer('mentor_id').unsigned().references('id').inTable('main.users').notNullable();
    table.integer('mentee_id').unsigned().references('id').inTable('main.users').notNullable();
    table.string('status').notNullable();
    table.datetime('created_at').notNullable();
  });
  await knex.schema.createTable('main.pathway_tracking_request_details', (table) => {
    table.increments();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
    table.integer('mentor_id').unsigned().references('id').inTable('main.users').notNullable();
    table.integer('mentee_id').unsigned().references('id').inTable('main.users').notNullable();
    table
      .integer('request_id')
      .unsigned()
      .references('id')
      .inTable('main.pathway_tracking_request')
      .notNullable();
    table.datetime('created_at').notNullable();
  });
  await knex.schema.createTable('main.pathway_tracking_request_parameter_details', (table) => {
    table.increments();
    table
      .integer('parameter_id')
      .unsigned()
      .references('id')
      .inTable('main.progress_parameters')
      .notNullable();
    table.integer('data').notNullable();
    table.datetime('created_at').notNullable();
  });
  await knex.schema.createTable('main.pathway_tracking_request_question_details', (table) => {
    table.increments();
    table
      .integer('question_id')
      .unsigned()
      .references('id')
      .inTable('main.progress_questions')
      .notNullable();
    table.string('data').notNullable();
    table.datetime('created_at').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema
    .dropTable('main.pathway_tracking_form_structure')
    .dropTable('main.pathway_tracking_request')
    .dropTable('main.pathway_tracking_request_details')
    .dropTable('main.pathway_tracking_request_parameter_details')
    .dropTable('main.pathway_tracking_request_question_details');
};
