

describe("teams page", function () {
  it("check if all teams are displayed", function () {
    cy.visit("/teams");
    cy.get(".team").then($res => {

      expect($res.length).to.equal(30);
      cy.task("getTeams", { project: { name: 1, _id: 1 } }).then(teamsDB => {
        $res.each(teamViewIndex => {
          const teamView = $res[teamViewIndex];
          const teamViewId = teamView.href.split("/").slice(-1)[0];
          const teamViewName = teamView.innerText.replace(/\u00a0/g, '').replace("&nbsp", "").replace("&nbsp;", "").replace("\n", "");


          let teamViewNameChars = "";
          for (let char of teamViewName.replace(/\u00a0/g, '').replace("&nbsp", "").replace("&nbsp;", "").replace("\n", "").replace(" ", "")) {
            teamViewNameChars = teamViewNameChars.concat(char);
          }
          let teamDBChars = "";
          for (let char of teamsDB[0].name.replace(/\u00a0/g, '').replace("&nbsp", "").replace("&nbsp;", "").replace("\n", "")) {
            teamDBChars = teamDBChars.concat(char);
          }

          console.log(teamViewNameChars, teamDBChars);
          console.log(teamViewNameChars == teamDBChars);


          for (let teamDB in teamsDB) {
            if (teamDB.name == teamViewName && teamDB._id == teamViewId) {
              valid = true;

              break;
            }
          };
          expect(valid).to.be.true;

        });
      });
    });

  });

});
