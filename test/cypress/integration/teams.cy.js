

describe("teams page", function () {
  it("check if all teams are displayed", function () {
    cy.visit("/teams");
    cy.get(".team").then($res => {

      expect($res.length).to.equal(30);
      cy.task("getTeams", { project: { name: 1, _id: 1 } }).then(teamsDB => {
        console.log(teamsDB);
        $res.each(teamViewIndex => {
          const teamView = $res[teamViewIndex];
          const teamViewId = teamView.href.split("/").slice(-1)[0];
          const teamViewName = teamView.innerText.replaceAll(/\u00a0/g, '').replaceAll(" ", "");


          let valid = false
          for (let teamDB of teamsDB) {
            if (teamDB.name.replaceAll(/\u00a0/g, '').replaceAll(" ", "") == teamViewName && teamDB._id == teamViewId) {
              valid = true;
              break;
            }
          };
          expect(valid).to.be.true;

        });
      });
    });

  });


  it("click link", function () {
    cy.visit("/teams");
    cy.contains("Boston Celtics").click();
    cy.url().then($url => {
      expect($url).to.contain("/team");
    });
  });

});
