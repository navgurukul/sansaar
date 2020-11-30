module.exports = {
  onCoursesTrigger: async (table) => {
    return `CREATE TRIGGER courses_all_exercises_completed AFTER UPDATE ON ${table} FOR EACH ROW INSERT INTO 'main.course_completion' (user_id, course_id) VALUES ("59", "37")`;
  },
};
