
exports.up = function(knex) {
    return knex.schema.createTable('main.meraki', function(table) {
      table.string('username').notNullable();
      table.string('password').notNullable();
      // Add more fields as needed
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('meraki');
  };
