exports.up = function(knex) {
    const dropQueries = [
      knex.raw('ALTER TABLE classes_to_courses DROP CONSTRAINT IF EXISTS classes_to_courses_pathway_id_v1_foreign;'),
      knex.raw('ALTER TABLE classes_to_courses DROP CONSTRAINT IF EXISTS classes_to_courses_course_id_v1_foreign;'),
      knex.raw('ALTER TABLE classes_to_courses DROP CONSTRAINT IF EXISTS classes_to_courses_exercise_id_v1_foreign;'),
      knex.raw('ALTER TABLE classes_to_courses DROP CONSTRAINT IF EXISTS classes_to_courses_pathway_id_v2_foreign;'),
      knex.raw('ALTER TABLE classes_to_courses DROP CONSTRAINT IF EXISTS classes_to_courses_course_id_v2_foreign;'),
      knex.raw('ALTER TABLE classes_to_courses DROP CONSTRAINT IF EXISTS classes_to_courses_exercise_id_v2_foreign;')
    ];
  
    return Promise.all(dropQueries);
  };
  exports.down = function(knex) {
    return knex.schema.alterTable('classes_to_courses', function(table) {
      table.foreign('pathway_id_v1').references('id').inTable('pathways').withKeyName('classes_to_courses_pathway_id_v1_foreign');
      table.foreign('course_id_v1').references('id').inTable('courses').withKeyName('classes_to_courses_course_id_v1_foreign');
      table.foreign('exercise_id_v1').references('id').inTable('exercises').withKeyName('classes_to_courses_exercise_id_v1_foreign');
      table.foreign('pathway_id_v2').references('id').inTable('pathways').withKeyName('classes_to_courses_pathway_id_v2_foreign');
      table.foreign('course_id_v2').references('id').inTable('courses').withKeyName('classes_to_courses_course_id_v2_foreign');
      table.foreign('exercise_id_v2').references('id').inTable('exercises').withKeyName('classes_to_courses_exercise_id_v2_foreign');
    });
  };
  