exports.up = async (knex) => {
    await knex.schema.createTable('main.c4ca_students', (table) => {
      table.increments().primary();
      table.string('name').notNullable();
      table.integer('class').notNullable().unsigned();
      table.integer('teacher_id').references('id').inTable('main.c4ca_teachers').onDelete('CASCADE').onUpdate('CASCADE').notNullable();
      table.integer('team_id').references('id').inTable('main.c4ca_teams').onDelete('CASCADE').onUpdate('CASCADE').notNullable();
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('main.c4ca_students');
  };
  