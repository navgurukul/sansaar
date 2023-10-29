exports.up = async (knex) => {
    await knex.schema.alterTable('main.assessment_outcome', (table) => {
        table.integer('team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('main.c4ca_teams')
        .onDelete('set null');
        table.integer('user_id').nullable().alter();

    });
    await knex.schema.alterTable('main.assessment_result', (table) => {
        table.integer('team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('main.c4ca_teams')
        .onDelete('set null');
        table.integer('user_id').nullable().alter();

    });    
    
    await knex.schema.alterTable('main.learning_track_status_outcome', (table) => {
        table.integer('team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('main.c4ca_teams')
        .onDelete('set null');
        table.integer('user_id').nullable().alter();

    });

    await knex.schema.alterTable('main.learning_track_status', (table) => {
        table.integer('team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('main.c4ca_teams')
        .onDelete('set null');
        table.integer('user_id').nullable().alter();

    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.assessment_outcome', (table) => {
        table.dropColumn('team_id');
    });
    await knex.schema.alterTable('main.assessment_result', (table) => {
        table.dropColumn('team_id');
    });
    await knex.schema.alterTable('main.learning_track_status_outcome', (table) => {
        table.dropColumn('team_id');
    });
    await knex.schema.alterTable('main.learning_track_status', (table) => {
        table.dropColumn('team_id');
    });

  };
