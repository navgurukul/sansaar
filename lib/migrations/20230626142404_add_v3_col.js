exports.up = async (knex) => {
    await knex.schema.alterTable('main.classes_to_courses', (table) => {
      table.text('pathway_id_v3');
      table.text('course_id_v3');
      table.text('exercise_id_v3');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.classes_to_courses', (table) => {
      table.dropColumn('pathway_id_v3');
      table.dropColumn('course_id_v3');
      table.dropColumn('exercise_id_v3');
    });
  };
  