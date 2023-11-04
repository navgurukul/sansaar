exports.up = async (knex) => {
    await knex.schema.alterTable('main.classes_to_courses', (table) => {
      table.integer('pathway_v3');
      table.integer('course_v3');
      table.integer('exercise_v3');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('main.classes_to_courses', (table) => {
      table.dropColumn('pathway_v3');
      table.dropColumn('course_v3');
      table.dropColumn('exercise_v3');
    });
  };
  