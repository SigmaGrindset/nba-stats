
describe("search for player", function () {


  it("search player - lebron james", function () {
    cy.visit("/");
    cy.get("input").type("lebron").type("{enter}");
    cy.url().then($url => {
      expect($url).to.include("/search/lebron");
    });
    cy.get(".info-text").should("contain.text", "Showing results");
    cy.get(".info-text").should("contain.text", "lebron");

    cy.get(".repr-card").as("player-card");
    cy.get("@player-card").should("contain.text", "LeBron James");
    cy.get("@player-card").should("contain.text", "#6");
    cy.get("@player-card").should("contain.text", "Forward");
  });

  it("search team - lakers", function () {
    cy.visit("/");
    cy.get("input").type("los angeles").type("{enter}");
    cy.get(".info-text").should("contain.text", "Showing results");
    cy.get(".info-text").should("contain.text", "los angeles");

    cy.contains("Los Angeles Lakers").as("team-card");
    cy.get("@team-card").should("contain.text", "Western")
  });

  it("search with empty query", function () {
    cy.visit("/");
    cy.get("input").type("{enter}");
    cy.url().then($url => {
      expect($url).to.not.include("/search");
    });
  });

  it("search something that doesn't exist", function () {
    cy.visit("/");
    cy.get("input").type("njkdsanjkdnsajdnjkasndjkaskdnanjdsnak").type("{enter}");
    cy.get(".info-text").should("contain.text", "No matching results");
    cy.get(".info-text").should("contain.text", "njkdsanjkdnsajdnjkasndjkaskdnanjdsnak");

    cy.get(".repr-card").should("not.exist");

  });

  it("search with icon click", function () {
    cy.visit("/");
    cy.get("input").type("njkdsanjkdnsajdnjkasndjkaskdnanjdsnak");
    cy.get("#search-icon").click();
    cy.url().then($url => {
      expect($url).to.include("/search");
    });
  });
});
