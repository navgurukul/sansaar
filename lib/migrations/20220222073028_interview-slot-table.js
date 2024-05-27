exports.up = async (knex) => {
  await knex.schema.createTable("main.interview_slot", (table) => {
    table.increments();
    table
      .integer("owner_id")
      .references("id")
      .inTable("main.interview_owners");
    table
      .integer("student_id")
      .references("id")
      .inTable("main.students")
      .notNullable()
      .notNullable();
    table.string("student_name");
    table
      .integer("transition_id")
      .references("id")
      .inTable("main.stage_transitions");
    table.string("topic_name").notNullable();
    table.string("start_time").notNullable();
    table.string("end_time");
    table.string("end_time_expected").notNullable();
    table.datetime("on_date").notNullable();
    table.string("duration");
    table.string("status").notNullable();
    table.boolean("is_cancelled").default(false);
    table.string("cancelltion_reason");
    table.datetime("created_at").notNullable();
    table.datetime("updated_at");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("main.interview_slot");
};
