
exports.up = function(knex) {
  // Change the `selected_options` column to nullable
  return knex.schema.alterTable('assessment_outcome', function(table) {
    table.integer('selected_option').nullable().alter();
  })
  .then(function() {
    // Add a new column called `multiple_choice`
    return knex.schema.table('assessment_outcome', function(table) {
      table.string('multiple_choice', 255);
    });
  });
};

exports.down = function(knex) {
  // Revert the changes: make `selected_options` notNullable again
  return knex.schema.alterTable('assessment_outcome', function(table) {
    table.integer('selected_option').notNullable().alter();
  })
  .then(function() {
    // Remove the `multiple_choice` column
    return knex.schema.table('assessment_outcome', function(table) {
      table.dropColumn('multiple_choice');
    });
  });
};
