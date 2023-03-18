

describe("test player", function () {

  it("manual picked", function () {
    const id = "1628997"
    cy.visit(`/player/${id}`);

    cy.task("getPlayer", { playerId: id }).then(player => {
      cy.task("teamRosterQuery", { player: player._id }).then(teamRoster => {
        teamRoster = teamRoster[0];
        // general info
        cy.get(".main-info .name").then($elem => {
          expect($elem[0].innerText.replaceAll("\n", "")).to.include(player.name);
        });
        cy.get(".main-info .desc").then($elem => {
          expect($elem[0].innerText.replaceAll("\n", "").replaceAll("&nbsp;", "")).to.include(teamRoster.team.name);
        });
        cy.contains(player.number);
        cy.contains(player.position);
        cy.get("#player").then($img => {
          expect($img[0].currentSrc).to.equal(player.imageURL);
        });
        cy.get(".profile-wrapper").then($elem => {
          expect($elem[0].outerHTML).to.include(player.pageColor);
          expect($elem[0].outerHTML).to.include(teamRoster.team.pageColor);
        });

        const stats = ["ppg", "apg", "rpg", "pie"];
        for (let stat of stats) {
          cy.contains(stat.toUpperCase()).parent().within(() => {
            cy.contains(player.stats[stat]);
          });
        }

        const playerInfo = ["height", "weight", "country", "last_attended"
          , "birthdate", "draft", "experience", "age"];

        for (let info of playerInfo) {
          let infoString = info;
          if (infoString.includes("_")) {
            infoString = infoString.split("_").join(" ");
          }
          infoString = infoString[0].toUpperCase().concat(infoString.slice(1));
          cy.contains(infoString).parent().within(() => {
            cy.contains(player[info]);
          });
        }



        // career stats
        cy.task("careerStatsQuery", { player: player._id }).then(statGroups => {

          for (let statGroup of statGroups) {
            console.log(statGroup)
            cy.contains(statGroup.statsGroupName).parent().within(() => {
              cy.get("tbody tr").then($rows => {
                $rows.each(rowIndex => {
                  const row = $rows[rowIndex];
                  let seasonData = false;
                  const cells = row.querySelectorAll("td");
                  for (let seasonStats of statGroup.data) {
                    if (cells[0].innerText.includes(seasonStats.season_id) && cells[1].innerText.includes(seasonStats.team)) {
                      seasonData = seasonStats;
                    }
                  }
                  expect(seasonData).to.not.equal(false);
                  delete seasonData._v;
                  delete seasonData.player;
                  delete seasonData.type;
                  delete seasonData._id;
                  Object.values(seasonData).forEach(val => {
                    cy.contains(val);
                  })
                })
              });
            });
          }

        });

      });

    });
  });

});
