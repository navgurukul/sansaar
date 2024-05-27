exports.up = async (knex) => {
    await knex.schema.createTable("main.student_job_details", (table) => {
      table.increments();
      table
        .integer("student_id")
        .references("id")
        .inTable("main.students")
        .notNullable();
      table.string("job_designation");
      table.string("job_location");
      table.string("salary");
      table.string("job_type");
      table.string("employer");
      table.string("resume");
      table.datetime("offer_letter_date");
      table.string("video_link");
      table.string("photo_link");
      table.string("write_up");
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable("main.student_job_details");
  };