exports.up = function(knex) {
  return knex.schema.createTable('main.person_information', function(table) {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('state').notNullable();
    table.string('number').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('main.person_information');
};

