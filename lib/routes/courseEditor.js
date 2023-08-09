const Joi = require('@hapi/joi');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../../server/logger');
const { getRouteScope } = require('./helpers');
const Courses = require('../models/courses');
const classInformation = require('../helpers/classesInfo/pythonClassInfo.json');


module.exports = []