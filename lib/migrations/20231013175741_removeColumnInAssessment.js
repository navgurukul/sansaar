exports.up = function (knex) {
  return knex.schema.table('main.assessment_outcome', function (table) {
    // Change the data type of the 'selected_options' column to string\

    table.string('selected_option').alter();
    // Delete the 'multiple_choice' column
    table.dropColumn('multiple_choice');
  });
};

exports.down = function (knex) {
  return knex.schema.table('main.assessment_outcome', function (table) {
    // Revert the 'selected_options' column data type change (if needed)
    table.integer('selected_option').alter();

    // Re-add the 'multiple_choice' column (if needed)
    table.string('multiple_choice');
  });
};
