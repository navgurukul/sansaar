exports.up = async (knex) => {
  await knex.schema.dropTable('main.submissions');
};

exports.down = async (knex) => {
  await knex.schema.createTable('main.submissions', (table) => {
    table.increments();
    table.integer('exercise_id').references('id').inTable('main.exercises').notNullable();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.datetime('submitted_at').notNullable();
    table.string('submitter_notes', 300);
    table.string('files');
    table.integer('peer_reviewer_id');
    table.string('notes_reviewer');
    table.datetime('reviewed_at');
    table.boolean('completed');
    table.datetime('completed_at');
    table.integer('mark_completed_by');
  });
};
