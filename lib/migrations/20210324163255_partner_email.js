exports.up = async (knex) => {
  await knex.schema.alterTable("main.partners", (table) => {
    table.string("email");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("main.partners", (table) => {
    table.dropColumn("email");
  });
};
