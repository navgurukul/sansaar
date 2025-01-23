exports.up = async (knex, Promise) => {
  await knex.schema.createTable('main.cluster_managers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('point_of_contact', 100);
    table.string('email', 255).notNullable().unique();
    table.string('web_link', 255);
    table.string('phone_number', 15).unique();
    table.integer('admin_id').unsigned().notNullable();
    table.string('short_code', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('admin_id')
      .references('id')
      .inTable('main.users')
      .onDelete('CASCADE');

  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.dropTableIfExists('main.cluster_managers');
};
