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
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathway_id'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { pathwayId } = request.params;
        const coursesByPathwayId = await coursesService.findCoursesByPathwayId(pathwayId);
        return coursesByPathwayId;
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
          sequence_num: PathwayCourses.field('sequence_num'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { pathwayId } = request.params;
        const pathwayCourses = await coursesService.addCourseByPathwayId(
          pathwayId,
          request.payload
        );
        return { pathwayCourses };
      },
    },
  },
  {
    method: 'PUT',
    path: '/pathways/{pathwayId}/courses/{pathwayCourseId}',
    options: {
      description: 'Update the course for a specific pathways course',
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
        payload: Joi.object({
          course_id: PathwayCourses.field('course_id'),
          sequence_num: PathwayCourses.field('sequence_num'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { pathwayId, pathwayCourseId } = request.params;
        const updatedpathwayCourses = await coursesService.updateCourseByPathwayId(
          pathwayId,
          pathwayCourseId,
          request.payload
        );
        return { updatedpathwayCourses };
      },
    },
  },
];
