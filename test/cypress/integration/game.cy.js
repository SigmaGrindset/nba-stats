
describe("test game", function () {

  it("game", function () {
    cy.task("getGame").then(game => {
      cy.visit(`/game/${game._id}`)
      cy.get(".summary").then($text => {
        expect($text[0].innerText.replaceAll("\n")).to.include(game.summaryText.toUpperCase());
      });
      cy.contains(game.summaryLocation);
      cy.contains(game.homeTeamStats.pts);
      cy.contains(game.awayTeamStats.pts);

      // cy.get("#team1").then($elem => {
      //   expect($elem[0].currentSrc).to.equal(game.homeTeam.imageURL);
      // });
      // cy.get("#team2").then($elem => {
      //   expect($elem[0].currentSrc).to.equal(game.awayTeam.imageURL);
      // });
      // kada namjestim scrape
      cy.get(".stats-table-wrapper").then($tables => {
        cy.task("getTeamPlayersGameStats", { teamId: game.homeTeam._id, gameId: game._id }).then(homeTeamPlayerStats => {
          cy.task("getTeamPlayersGameStats", { teamId: game.awayTeam._id, gameId: game._id }).then(awayTeamPlayerStats => {
            const tables =
              [{
                table: $tables[0],
                team: game.homeTeam,
                teamStats: game.homeTeamStats,
                playerStats: homeTeamPlayerStats
              },
              {
                table: $tables[1],
                team: game.awayTeam,
                teamStats: game.awayTeamStats,
                playerStats: awayTeamPlayerStats
              }];


            for (let teamData of tables) {
              cy.wrap(teamData.table).within(() => {
                cy.get(".table-heading").then($elem => {
                  expect($elem[0].innerText.replaceAll("&nbsp;", "")).to.equal(teamData.team.name);
                });

                cy.get("tbody tr").then($rows => {
                  $rows.each(rowIndex => {
                    const row = $rows[rowIndex];
                    let rowMatchedData = false;
                    const playerName = row.querySelector("td").innerText;
                    for (let rowStats of teamData.playerStats) {
                      if (playerName.includes(rowStats.player.name)) {
                        rowMatchedData = rowStats;
                      }
                    }
                    if (rowMatchedData == false) {
                      if (playerName.toUpperCase().includes("TOTALS")) {
                        rowMatchedData = teamData.teamStats;
                      }
                    }

                    expect(rowMatchedData).to.not.equal(false);
                    cy.wrap(row).within(() => {
                      if (rowMatchedData.player) {
                        // ako je stats igraca
                        if (rowMatchedData.stats.status) {
                          // ako igrac nije igrao
                          cy.contains(rowMatchedData.stats.status);
                          cy.contains(rowMatchedData.player.name);
                        } else {
                          // ako je igrao
                          cy.contains(rowMatchedData.stats.pts);
                          cy.contains(rowMatchedData.stats.fgm);
                          cy.contains(rowMatchedData.stats.ast);
                          cy.contains(rowMatchedData.stats.reb);
                          cy.contains(rowMatchedData.stats.min);
                        }
                      } else {
                        // ako je statistika teama
                        cy.contains(rowMatchedData.pts);
                        cy.contains(rowMatchedData.ast);
                        cy.contains(rowMatchedData.reb);
                        cy.contains(rowMatchedData.fta);
                      }
                    });
                  });
                });
              });
            }
          });
        });

      });
      // game info
      cy.get(".info-card").within(() => {
        cy.contains(game.date);
        cy.contains(game.location);
        cy.contains(game.officials);
        cy.contains(game.attendance);
      });
    });



  });

});
