exports.up = async (knex, Promise) => {
  await knex.schema.createTable('main.cluster_managers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('point_of_contact', 100);
    table.string('email', 255).notNullable();
    table.string('web_link', 255);
    table.string('phone_number', 15);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.dropTableIfExists('main.cluster_managers');
};
