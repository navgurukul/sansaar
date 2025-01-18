exports.up = async (knex, Promise) => {
  await knex.schema.createTable('main.career_teams', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('description', 255).nullable();
    table.integer('career_teacher_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('career_teacher_id')
      .references('id')
      .inTable('main.career_teachers')
      .onDelete('CASCADE');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.dropTableIfExists('main.career_teams');
};
