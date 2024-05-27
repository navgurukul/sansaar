exports.up = async (knex) => {
    await knex.schema.createTable('main.c4ca_students_projectDetail', (table) => {
      table.increments().primary();
      table.string('project_title');
      table.string('project_summary');
      table.string('project_uploadFile_url').notNullable();
      table.date('Started_date')
      table.integer('teacher_id').references('id').inTable('main.c4ca_teachers').notNullable();
      table.integer('team_id').references('id').inTable('main.c4ca_teams').notNullable();
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('main.c4ca_students_projectDetail');
  };
  