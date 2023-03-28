const chai = require('chai');
const { expect } = require('chai');
const chaiHttp = require('chai-http');
const { PerformanceObserver, performance } = require('perf_hooks');

function responceTimeTest(){
  return new PerformanceObserver((list, observer) => {
    const entry = list.getEntries()[0];
    const loadingTime = entry.duration;
    expect(loadingTime).to.be.lessThan(500);
    observer.disconnect();
  });
}
// Test shortcuts
const url = 'http://localhost:5000';
const user_id = 3742;
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI1NjIiLCJlbWFpbCI6ImJodXBlbmRyYTIwQG5hdmd1cnVrdWwub3JnIiwiaWF0IjoxNjc4NDY5ODcxLCJleHAiOjE3MTAwMjc0NzF9.1by-O0SuW3BH2OlXEpUzgr8s9dXtJwdov1rRhbZh6CA';

// Configure chai to use chai-http for API calls
chai.use(chaiHttp);


describe(`HTTP ${url}/search/{user_id} GET API test`, () => {
  it('API test 2 || should return status code 200 for valid user_id and auth token', async () => {
    const obs = new PerformanceObserver((list, observer) => {
      const entry = list.getEntries()[0];
      const loadingTime = entry.duration;
      expect(loadingTime).to.be.lessThan(500);
      performance.clearMarks();
      observer.disconnect();
    });

    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const name = 'python';
      const res = await chai
      .request(url)
      .get(`/search/${user_id}`)
      .set('Authorization', `Bearer ${token}`);
      
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('top_popular');
    }
    
    
    // expect(res).to.have.property('duration').lessThan(500);
  });
});

// Tests for the '/search/{user_id}/{name}' endpoint
describe(`HTTP ${url}/search/{user_id}/{name} POST API test`, () => {
  it('API test 3 || should return status code 200 for valid user_id and auth token', async () => {
    const obs = new PerformanceObserver((list, observer) => {
      const entry = list.getEntries()[0];
      const loadingTime = entry.duration;
      expect(loadingTime).to.be.lessThan(500);
      performance.clearMarks();
      observer.disconnect();
    });

    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const name = 'python';
      const res = await chai
        .request(url)
        .post(`/search/${user_id}/${name}`)
        .set('Authorization', `Bearer ${token}`);
        
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
    }
    
  });
});
  
  describe(`HTTP ${url}/search GET API`, () => {
    it('API test 1 || GET method status 200', async () => {
      const obs = new PerformanceObserver((list, observer) => {
        const entry = list.getEntries()[0];
        const loadingTime = entry.duration;
        expect(loadingTime).to.be.lessThan(500);
        performance.clearMarks();
        // performance.clearFunctions()
        // performance.clearMeasures();
        observer.disconnect();
      });
  
      obs.observe({ entryTypes: ['measure'] });
      
      // Make 5 requests and measure their performance
      for (let i = 0; i < 5; i++) {
        performance.mark(`start-${i}`);
        const res = await chai.request(url).get('/search/popular');
        performance.mark(`end-${i}`);
        performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('top_popular');
        expect(res.body).to.be.an('object');
      }
    });
  });
