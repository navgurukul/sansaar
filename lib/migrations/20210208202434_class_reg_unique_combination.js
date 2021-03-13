exports.up = async (knex) => {
  await knex.schema.alterTable('main.class_registrations', (table) => {
    table.unique(['user_id', 'class_id']);
  });
  await knex.schema.alterTable('main.course_enrolments', (table) => {
    table.unique(['student_id', 'course_id']);
  });
  await knex.schema.alterTable('main.student_pathways', (table) => {
    table.unique(['user_id', 'pathway_id']);
  });
  await knex.schema.alterTable('main.mentor_tree', (table) => {
    table.unique(['mentor_id', 'mentee_id']);
  });
  await knex.schema.alterTable('main.sansaar_user_roles', (table) => {
    table.unique(['user_id', 'role']);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.class_registrations', (table) => {
    table.dropUnique(['user_id', 'class_id']);
  });
  await knex.schema.alterTable('main.course_enrolments', (table) => {
    table.dropUnique(['student_id', 'course_id']);
  });
  await knex.schema.alterTable('main.student_pathways', (table) => {
    table.dropUnique(['user_id', 'pathway_id']);
  });
  await knex.schema.alterTable('main.mentor_tree', (table) => {
    table.dropUnique(['mentor_id', 'mentee_id']);
  });
  await knex.schema.alterTable('main.sansaar_user_roles', (table) => {
    table.dropUnique(['user_id', 'role']);
  });
};
