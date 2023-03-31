const chai = require('chai');
const { expect } = require('chai');
const chaiHttp = require('chai-http');
const { PerformanceObserver, performance } = require('perf_hooks');

// Base url for the testing
const url = 'http://localhost:5000';

// Configure chai to use chai-http for API calls
chai.use(chaiHttp);

// auth token you need to give you Own 
const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI1NjIiLCJlbWFpbCI6ImJodXBlbmRyYTIwQG5hdmd1cnVrdWwub3JnIiwiaWF0IjoxNjc4NDY5ODcxLCJleHAiOjE3MTAwMjc0NzF9.1by-O0SuW3BH2OlXEpUzgr8s9dXtJwdov1rRhbZh6CA';


function responceTimeTest() {
  return new PerformanceObserver((list, observer) => {
    const entry = list.getEntries()[0];
    const loadingTime = entry.duration;
    expect(loadingTime).to.be.lessThan(10000);
    performance.clearMarks();
    observer.disconnect();
  });
}

module.exports = [chai, expect, token, performance, responceTimeTest, url];
