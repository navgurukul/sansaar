exports.up = async (knex) => {
  await knex.schema.createTable("main.interview_owners", (table) => {
    table.increments();
    table
      .integer("user_id")
      .unique()
      .unsigned()
      .references("id")
      .inTable("main.c_users")
      .notNullable();
    table.boolean("available");
    table.integer("max_limit").default(10);
    table.specificType("type", "TEXT[]");
    table.integer("pending_interview_count");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("main.interview_owners");
};
