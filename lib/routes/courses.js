
module.exports = [
  {
    method: 'GET',
    path: '/courses',
    options: {
      description: 'Get all courses',
      tags: ['api'],
      handler: async (request) => {
        const { coursesService } = request.services();
        const courses = await coursesService.getAllCourses();
        return courses;
      },
    },
  },
];