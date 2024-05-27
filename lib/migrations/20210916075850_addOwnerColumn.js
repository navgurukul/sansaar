exports.up = async (knex) => {
  await knex.schema.alterTable("students", (table) => {
    table
      .integer("current_owner_id")
      .references("id")
      .inTable("interview_owners");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("students", (table) => {
    table.dropColumn("current_owner_id");
  });
};
