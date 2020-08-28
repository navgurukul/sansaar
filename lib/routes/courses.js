const Joi = require('@hapi/joi');
const PathwayCourses = require('../models/pathwayCourses');
const { getRouteScope } = require('./helpers');

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
        const { coursesService } = request.services();
        const authUser = request.auth.credentials;
        const courses = await coursesService.getAllCourses(authUser);
        return courses;
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/courses',
    options: {
      description: 'Get all courses of a particular pathway id.',
      tags: ['api'],
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathwayId'),
        }),
      },
      handler: async (request) => {
        const { coursesService, displayService } = request.services();
        const { pathwayId } = request.params;
        const courses = await coursesService.findCoursesByPathwayId(pathwayId);
        return { courses };
      },
    },
  },
  {
    method: 'POST',
    path: '/pathways/{pathwayId}/courses',
    options: {
      description: 'Add the course for a specific pathway ID',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathway_id'),
        }),
        payload: Joi.object({
          course_id: PathwayCourses.field('course_id'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { pathwayId } = request.params;
        const pathwayCourse = await coursesService.addCourseByPathwayId(pathwayId, request.payload);
        return { pathwayCourse };
      },
    },
  },
  {
    method: 'PUT',
    path: '/courses/{pathwayId}/pathway',
    options: {
      description: 'Update the courses for a specific pathway ID.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathwayId'),
        }),
        payload: Joi.object({
          course_id: PathwayCourses.field('course_id'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
<<<<<<< HEAD
        const { pathwayId } = request.params;
        return coursesService.updateCoursesByPathwayId(pathwayId, request.payload);
=======
        const { pathwayId, pathwayCourseId } = request.params;
        const updatedpathwayCourse = await coursesService.updateCourseByPathwayId(
          pathwayId,
          pathwayCourseId,
          request.payload
        );
        return { updatedpathwayCourse };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/courses/{pathwayCourseId}',
    options: {
      description: 'Get single pathway course by ID',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathway_id'),
          pathwayCourseId: PathwayCourses.field('id'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { pathwayId, pathwayCourseId } = request.params;
        const pathwayCourse = await coursesService.getPathwayCourseById(pathwayId, pathwayCourseId);
        return { pathwayCourse };
>>>>>>> f30cc40... minor changes as per nayak
      },
    },
  },
];
