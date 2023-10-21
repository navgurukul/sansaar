/// <reference types="cypress" />

// GET

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI4ODMiLCJlbWFpbCI6ImpheXNocmkyMEBuYXZndXJ1a3VsLm9yZyIsImlhdCI6MTY5NzAxNTAyMywiZXhwIjoxNzI4NTcyNjIzfQ.G6T02H9I2nNHDsbZJ1SkocXmbHbIfNxVAYusv5Rn0Yo";
const headers = {
  Authorization: `Bearer ${token}`
};

describe ("HTTP Requests",()=>{
    it("GET /pathways/names",()=>{
      cy.request('GET', 'https://merd-api.merakilearn.org/pathways/names')
      .its('status')
      .should('equal', 200);
    })
    
    it("GET /search/popular",()=>{
      cy.request('GET', 'https://merd-api.merakilearn.org/search/popular')
      .its('status')
      .should('equal', 200);
    })


    it("GET /assessment/1/student/result", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/assessment/1/student/result',
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });



    it("GET /assessment/allAssessments", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/assessment/allAssessments', // Corrected URL
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });



    it("GET /assessment/1", () => {
    
      const headers = {
        Authorization: `Bearer ${token}`
      };
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/assessment/1', // Your specified URL
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /classes", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/classes', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });



    it("GET /classes/all", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/classes/all', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /classes/studentEnrolment", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/classes/studentEnrolment', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /classes/today", () => {
      cy.request({
        method: 'GET',
        url: '    https://merd-api.merakilearn.org/classes/today', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });




    it("GET /courses", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/courses', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /courses/name", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/courses/name', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /englishAi/content", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/englishAi/content', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /englishAi/content/1", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/englishAi/content/1', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /englishAi/contentLevelWise/1", () => {
      cy.request({
        method: 'GET',
        url: '    https://merd-api.merakilearn.org/englishAi/contentLevelWise/1', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /englishAi/history", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/englishAi/history', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /partner/1", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/partner/1', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /partners?limit=11&page=1&name=h", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/partners?limit=11&page=1&name=h', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /partners/1/groups", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/partners/1/groups', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });



    it("GET /partners/1/group", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/partners/1/group', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });



    it("GET /partners/batch_details/1", () => {
      cy.request({
        method: 'GET',
        url: 'http://merd-api.merakilearn.org/partners/batches/1', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /partners/spaceby/1", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/partners/spaceby/1', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/1/ACBEnrolledBatches", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/1/ACBEnrolledBatches', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });

    it("GET /pathways/1/completePortion", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/1/completePortion', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/1/enrolledBatches", () => {
      cy.request({
        method: 'GET',
        url: '    https://merd-api.merakilearn.org/pathways/1/enrolledBatches', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/1/undefined/mentorship/tree", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/1/mentorship/tree', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });

    it("GET /pathways/1/milestones", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/1/milestones', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });

    it("GET /pathways/1/upcomingBatches", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/1/upcomingBatches', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });

    it("GET /pathways/2/upcomingEnrolledClasses", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/2/upcomingEnrolledClasses', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });

    it("GET /pathways/1/upcomingEnrolledRevisionClasses", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/1/upcomingEnrolledRevisionClasses', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/1/userEnrolledClasses", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/1/userEnrolledClasses', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/c4ca", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/c4ca', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/complete/1", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/complete/1', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/complete/1", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/courses?courseType=markdown', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/complete/1", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/doubtclasses/1', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });



    it("GET /pathways/dropdown", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/dropdown', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });

    it("GET /pathways/names", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/names', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });


    it("GET /pathways/ongoingTopic", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/ongoingTopic', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });

    it("GET /pathways/ongoingTopic", () => {
      cy.request({
        method: 'GET',
        url: 'https://merd-api.merakilearn.org/pathways/ResidentialPathway', 
        headers: headers
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });












































































































































    






















    











    
})