

describe("team page", function () {

  beforeEach(() => {
    cy.task("getTeams", { project: {} }).then(teams => {
      cy.wrap(teams).as("teams");
    });
  })

  it("test all parts of page for Boston Celtics", function () {

    cy.get("@teams").then($teams => {

      const team = $teams[0];
      cy.visit(`/team/${team._id}`)

      cy.get(".name").should("include.text", team.name);
      cy.get(".desc").should("include.text", team.record);
      cy.get(".desc").should("include.text", team.placementText);
      // cy.get("#team").then($image => {
      // expect($image[0].currentSrc).to.equal(team.imageURL);
      // });
      // kada promjenim scrape u vezi global linka za image

      cy.contains("PPG").parent().as("ppg-container");
      cy.get("@ppg-container").contains(team.ranksData.ppg.value);
      cy.get("@ppg-container").contains(team.ranksData.ppg.placement);
      cy.contains("APG").parent().as("apg-container");
      cy.get("@apg-container").contains(team.ranksData.apg.value);
      cy.get("@apg-container").contains(team.ranksData.apg.placement);
      cy.contains("RPG").parent().as("rpg-container");
      cy.get("@rpg-container").contains(team.ranksData.rpg.value);
      cy.get("@rpg-container").contains(team.ranksData.rpg.placement);
      cy.contains("OPPG").parent().as("oppg-container");
      cy.get("@oppg-container").contains(team.ranksData.oppg.value);
      cy.get("@oppg-container").contains(team.ranksData.oppg.placement);


      // check team players
      cy.get("#players-table tbody tr").then($rows => {
        cy.task("getTeamPlayers", { teamId: team._id }).then(players => {

          $rows.each(rowIndex => {
            const row = $rows[rowIndex];
            let playerInTable = false;
            let playerName = row.querySelector(".table-link").textContent;
            for (let { player } of players) {
              if (playerName.includes(player.name)) {
                playerInTable = player;
                break;
              }
            }

            expect(playerInTable).to.not.equal(false);
            // check if player is in table
            const cells = row.querySelectorAll("td");
            expect(cells[1].textContent).to.include(playerInTable.number);
            expect(cells[2].textContent).to.include(playerInTable.position);
            expect(cells[3].textContent).to.include(playerInTable.height);
            expect(cells[4].textContent).to.include(playerInTable.weight);
            expect(cells[5].textContent).to.include(playerInTable.birthdate);
            expect(cells[6].textContent).to.include(playerInTable.age);
            expect(cells[7].textContent).to.include(playerInTable.experience);
            expect(cells[8].textContent).to.include(playerInTable.last_attended);
          });
        });
      });


    });


  });

  it("menu list", function () {
    cy.get("@teams").then($teams => {
      const team = $teams[0];
      cy.visit(`/team/${team._id}`)
      cy.get("#games-table").should("not.be.visible");
      cy.get("#players-table").should("be.visible");
      cy.contains("Games played").click();
      cy.contains("Games played").click();
      cy.contains("Games played").click();
      cy.get("#players-table").should("not.be.visible");
      cy.get("#games-table").should("be.visible");
      cy.contains("Info").click();
      cy.get("#players-table").should("be.visible");
      cy.get("#games-table").should("not.be.visible");
    });


  });

  it("games played", function () {
    cy.get("@teams").then($teams => {
      const team = $teams[0];
      cy.task("getTeamGames", { teamId: team._id }).then(games => {

        console.log(games);
        cy.visit(`/team/${team._id}`);
        cy.contains("Games played").click();
        cy.get("#games-table tbody tr").then($rows => {
          $rows.each(row => {
            cy.wrap($rows[row]).within(() => {
              for (let game of games) {
                if ($rows[row].dataset.gameid == game._id) {
                  cy.contains(game.homeTeam.name.replaceAll(/\u00a0/g, ' '));
                  cy.contains(game.awayTeam.name.replaceAll(/\u00a0/g, ' '));
                  cy.contains(game.awayTeamStats.pts);
                  cy.contains(game.homeTeamStats.pts);
                }
              }
            });

          });
        });
      });
    });
  });

});
