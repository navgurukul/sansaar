exports.up = async (knex) => {
    await knex.schema.alterTable('main.exercise_completion_v2', (table) => {
        table.integer('team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('main.c4ca_teams')
        .onDelete('set null');
        table.integer('user_id').nullable().alter();

    });
    await knex.schema.alterTable('main.course_completion_v3', (table) => {
        table.integer('user_id').nullable().alter();
        table.integer('team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('main.c4ca_teams')
        .onDelete('set null');
        table.integer('percentage');

    });
    await knex.schema.alterTable('main.pathway_completion_v2', (table) => {
        table.integer('user_id').nullable().alter();
        table.integer('team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('main.c4ca_teams')
        .onDelete('set null');
        table.integer('percentage');
    });
    
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.exercise_completion_v2', (table) => {
        table.dropColumn('team_id');
    });
    await knex.schema.alterTable('main.course_completion_v3', (table) => {
        table.dropColumn('team_id');
    });
    await knex.schema.alterTable('main.pathway_completion_v2', (table) => {
        table.dropColumn('team_id');
    });
  };
