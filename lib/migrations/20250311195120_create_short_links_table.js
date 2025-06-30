exports.up = function(knex) {
  return knex.schema.createTable('main.short_links', function(table) {
    // Primary key
    table.increments('id').primary();
    
    // Main fields
    table.string('short_code', 10).notNullable().unique().index();
    table.text('original_url').notNullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_accessed');
    
    // Add comment to table (PostgreSQL specific)
    knex.raw(`
      COMMENT ON TABLE short_links IS 'Stores original URLs and their shortened codes for link shortener feature'
    `);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('main.short_links');
};