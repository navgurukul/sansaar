exports.up = async (knex) => {
    await knex.schema.createTable("main.chanakya_partner_relationship", (table) => {
      table.increments();
      table.integer("partner_id")
      .references("id")
      .inTable("main.partners")
      .notNullable();
      table.integer('partner_group_id')
      .references("id")
      .inTable("main.chanakya_partner_group")
      .notNullable();
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable("main.chanakya_partner_relationship");
  };