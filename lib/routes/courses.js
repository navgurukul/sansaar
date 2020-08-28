module.exports = [
  {
    method: 'GET',
    path: '/courses',
    options: {
      description: 'Get all courses',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      handler: async (request) => {
        const { courseService } = request.services();
        const authUser = request.auth.credentials;
        const courses = await courseService.getAllCourses(authUser);
        return courses;
      },
    },
  },
];
