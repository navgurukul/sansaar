exports.up = async (knex, Promise) => {
  await knex.schema.alterTable("interview_owners", (table) => {
    table.integer("gender");
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.alterTable("interview_owners", (table) => {
    table.dropColumn("gender");
  });
};
