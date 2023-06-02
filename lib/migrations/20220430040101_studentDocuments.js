exports.up = async (knex) => {
    await knex.schema.createTable("main.student_documents", (table) => {
      table.increments();
      table
        .integer("student_id")
        .references("id")
        .inTable("main.students")
        .notNullable();
      table.string("Resume_link");
      table.string("Id_proof_link");
      table.string("signed_consent_link");
      table.string("marksheet_link");
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable("main.student_documents");
  };
  