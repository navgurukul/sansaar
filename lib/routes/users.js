module.exports = [
  {
    method: 'POST',
    path: '/users/auth/google',
    options: {
      handler: async (request, h) => ({ underConstruction: 1 }),
    },
  },
  {
    method: 'GET',
    path: '/users',
    options: {
      handler: async (request, h) => ({ underConstruction: 1 }),
    },
  },
  {
    method: 'GET',
    path: '/users/{userId}',
    options: {
      handler: async (request, h) => ({ underConstruction: 1 }),
    },
  },
  {
    method: 'GET',
    path: '/users/me',
    options: {
      handler: async (request, h) => ({ underConstruction: 1 }),
    },
  },
];
