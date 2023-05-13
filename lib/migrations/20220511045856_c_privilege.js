  exports.up = async (knex) => {
    await knex.schema.createTable("main.chanakya_privilege", (table) => {
      table.increments();
      table.string("privilege",225).unique().notNullable();
      table.string("description",225).unique().notNullable();
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable("main.chanakya_privilege");
  };