const chai = require('chai');
const { expect } = require('chai');
const chaiHttp = require('chai-http');
const { PerformanceObserver, performance } = require('perf_hooks');
const Dotenv = require('dotenv');

Dotenv.config({ path: `${__dirname}/../../server/.env` });

// Base url for the testing
const url = process.env.BASE_URL;

// Configure chai to use chai-http for API calls
chai.use(chaiHttp);

// auth token you need to give you Own 
const token = process.env.TOKEN_AUTH;
console.log('token: ',token)

function responceTimeTest() {
  return new PerformanceObserver((list, observer) => {
    const entry = list.getEntries()[0];
    const loadingTime = entry.duration;
    expect(loadingTime).to.be.lessThan(20000);
    performance.clearMarks();
    observer.disconnect();
  });
}

module.exports = [chai, expect, token, performance, responceTimeTest, url];
