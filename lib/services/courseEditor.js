const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { val, transaction } = require('objection');

const CONFIG = require('../config/index');
const { errorHandler } = require('../errorHandling');
const { UTCToISTConverter } = require('../helpers/index');

module.exports = class CourseEditorService extends Schmervice.Service {}