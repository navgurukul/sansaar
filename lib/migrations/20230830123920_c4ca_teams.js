exports.up = async (knex) => {
  await knex.schema.createTable('main.c4ca_teams', (table) => {
    table.increments().primary();
    table.string('team_name').unique().notNullable();
    table.integer('team_size').notNullable().unsigned();
    table
      .integer('teacher_id')
      .references('id')
      .inTable('main.c4ca_teachers')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .notNullable();
    table.string('login_id').notNullable();
    table.string('password').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.c4ca_teams');
};
