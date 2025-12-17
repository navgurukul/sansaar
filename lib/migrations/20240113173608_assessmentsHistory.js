exports.up = async (knex) => {
    await knex.schema.createTable('main.assessments_history', (table) => {
      table.increments().primary();
      table.integer('slug_id').notNullable().unsigned();
      table.string('selected_option').notNullable();
      table.string('status').notNullable();
      table.integer('attempt_count').notNullable().unsigned();
      table.integer('course_id').notNullable().unsigned();
      table.integer('user_id').references('id').inTable('main.users');
      table.integer('team_id').references('id').inTable('main.c4ca_teams');
      table.string('lang').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('main.assessments_history');
  };
  