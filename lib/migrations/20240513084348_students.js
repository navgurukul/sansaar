// create_students_table.js

exports.up = function(knex) {
    return knex.schema.createTable('student', function(table) {
      table.increments('id').primary();
      table.string('studentId').notNullable();
      table.string('password').notNullable();
      // Add more fields as needed
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('students');
  };
  