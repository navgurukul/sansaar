exports.up = async (knex, Promise) => {
  await knex.schema.createTable('main.career_students', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.integer('class').unsigned().notNullable();
    table.integer('career_teacher_id').unsigned().notNullable();
    table.integer('career_team_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('career_teacher_id')
      .references('id')
      .inTable('main.career_teachers')
      .onDelete('CASCADE');

    table.foreign('career_team_id')
      .references('id')
      .inTable('main.career_teams')
      .onDelete('CASCADE');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.dropTableIfExists('main.career_students');
};
