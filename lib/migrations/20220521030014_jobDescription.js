exports.up = async (knex) => {
    await knex.schema.createTable("main.student_job_details", (table) => {
      table.increments();
      table
        .integer("student_id")
        .references("id")
        .inTable("main.students").unique()
        .notNullable();
      table.string("job_designation");
      table.string("job_location");
      table.string("salary");
      table.string("job_type");
      table.string("employer");
      table.datetime("offer_letter_date");
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable("main.student_job_details");
  };