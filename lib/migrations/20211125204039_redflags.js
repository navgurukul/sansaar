exports.up = async (knex, Promise) => {
  await knex.schema.alterTable("students", (table) => {
    table.string("redflag");
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.alterTable("students", (table) => {
    table.dropColumn("redflag");
  });
};
