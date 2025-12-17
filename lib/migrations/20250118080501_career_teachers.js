exports.up = async (knex, Promise) => {
  await knex.schema.createTable('main.career_teachers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('school', 100).notNullable();
    table.string('district', 100).notNullable();
    table.string('state', 100).notNullable();
    table.string('phone_number', 15).unique();
    table.string('email', 255).notNullable().unique();
    table.string('profile_url', 255);
    table.integer('user_id').unsigned().notNullable();
    table.integer('cluster_manager_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('id').inTable('main.users');
    table.foreign('cluster_manager_id').references('id').inTable('main.cluster_managers');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.dropTableIfExists('main.career_teachers');
};
