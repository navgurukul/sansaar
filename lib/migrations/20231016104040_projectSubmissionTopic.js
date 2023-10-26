exports.up = async (knex) => {
    await knex.schema.createTable('main.c4ca_team_projecttopic', (table) => {
      table.increments().primary();
      table.string('project_title');
      table.string('project_summary');
      table.string('project_topic_url');
      table.date('created_at');
      table.date('updated_at');
      table.integer('team_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('main.c4ca_teams')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
      table.string('team_name').notNullable();
      table.boolean('is_submitted');
    });
  };

  exports.down = async (knex) => {
    await knex.schema.dropTable('main.c4ca_team_projecttopic');
  };