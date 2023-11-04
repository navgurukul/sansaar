exports.up = async (knex, Promise) => {
  await knex.schema.alterTable("students", (table) => {
    table.text("image_url");
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.alterTable("students", (table) => {
    table.dropColumn("image_url");
  });
};
