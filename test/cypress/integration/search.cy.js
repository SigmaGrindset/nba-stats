
describe("search for player", function() {

    it("lebron james", function() {
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
});