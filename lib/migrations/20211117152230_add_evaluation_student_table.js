exports.up = async (knex, Promise) => {
  await knex.schema.alterTable("students", (table) => {
    table.string("evaluation");
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.alterTable("students", (table) => {
    table.dropColumn("evaluation");
  });
};
