exports.up = async (knex) => {
  await knex.schema.createTable('main.ongoing_topics', (table) => {
    table.increments().primary();
    table.integer('user_id').references('id').inTable('main.users');
    table
      .integer('team_id')
      .references('id')
      .inTable('main.c4ca_teams')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.integer('pathway_id').notNullable();
    table.integer('course_id').notNullable();
    table.integer('slug_id').notNullable();
    table.enum('type', ['exercise', 'assessment']).notNullable();
    table.integer('module_id');
    table
      .integer('project_topic_id')
      .references('id')
      .inTable('main.c4ca_team_projecttopic')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .integer('project_solution_id')
      .references('id')
      .inTable('main.c4ca_team_projectsubmit_solution')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.ongoing_topics');
};
