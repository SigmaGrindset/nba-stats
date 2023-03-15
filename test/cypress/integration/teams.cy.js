

describe("teams page", function () {
  it("check if all teams are displayed", function () {
    cy.visit("/teams");
    cy.get(".team").then($res => {

      expect($res.length).to.equal(30);

    });

  });

});
