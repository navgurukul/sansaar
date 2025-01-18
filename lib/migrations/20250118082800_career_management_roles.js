exports.up = async (knex, Promise) => {
  await knex.schema.createTable('main.career_roles', (table) => {
    table.increments('id').primary();
    table.string('role', 100).notNullable();
    table.integer('user_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id')
      .references('id')
      .inTable('main.users')
      .onDelete('CASCADE');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.dropTableIfExists('main.career_roles');
};
