const mongoose = require("mongoose");
const BoxScoreStats = require("./models/BoxScoreStats");
const Game = require("./models/Game");
const Player = require("./models/Player");
const PlayerCareerStats = require("./models/PlayerCareerStats");
const PlayerGameStats = require("./models/PlayerGameStats");
const Team = require("./models/Team");
const TeamCurrentRoster = require("./models/TeamCurrentRoster");

const { sleep } = require("./utils/scrape_utils");
const { getTeamLinks, scrapeTeam } = require("./scrape/teams");
const { getPlayerLinks, scrapePlayer, scrapePlayerStats, createLinkFromPlayerId, getPlayerStatsLink } = require("./scrape/players");
const { getGameLinks, scrapeGame } = require("./scrape/games");
const logger = require("./config/logger");


mongoose.connect("mongodb+srv://sanji:diablejambe@nba-stats.9dwaife.mongodb.net/nba-stats?retryWrites=true&w=majority")
  .then(logger.info("connected to db"))
  .catch(err => logger.error(err));


async function addPlayer(playerId, teamId, data) {
  const existingPlayer = await Player.findOne({ _id: playerId });
  if (!existingPlayer) {
    const playerData = await scrapePlayer(createLinkFromPlayerId(playerId));
    if (Object.values(playerData).length != 0) {
      const player = await Player.create({ ...playerData, _id: playerId, pageColor: data.pageColor });
      logger.info("player created: ", player.name);
    } else {
      logger.info(`player page for player ${playerId} doesnt exist`);
    }
  } else {
    logger.info("player exists: ", existingPlayer.name);
  }
  if (teamId) {
    // ako je retired igrac onda nece biti u timu
    await TeamCurrentRoster.assignPlayer(playerId, teamId);
  }

  // career stats;
  const playerStatsLink = await getPlayerStatsLink({ playerId });
  const careerStats = await scrapePlayerStats(playerStatsLink);
  if (careerStats.regSeason) {
    await PlayerCareerStats.handlePlayerStats(careerStats.regSeason, playerId);
  }
  if (careerStats.playoffs) {
    await PlayerCareerStats.handlePlayerStats(careerStats.playoffs, playerId);
  }
}


async function addGame(gameLink) {
  const gameId = gameLink.split("/").slice(-2)[0];
  const existingGame = await Game.findOne({ _id: gameId });
  if (!existingGame) {
    const gameData = await scrapeGame(gameLink);
    const awayTeamBoxScore = await BoxScoreStats.create({ ...gameData.boxScore[0].playerStats.slice(-1)[0] });
    const homeTeamBoxScore = await BoxScoreStats.create({ ...gameData.boxScore[1].playerStats.slice(-1)[0] });
    const game = await Game.create({
      _id: gameData.id,
      date: gameData.date,
      dateEpoch: gameData.dateEpoch,
      location: gameData.location,
      attendance: gameData.attendance,
      officials: gameData.officials,
      awayTeam: gameData.boxScore[0].teamId,
      homeTeam: gameData.boxScore[1].teamId,
      homeTeamStats: homeTeamBoxScore._id,
      awayTeamStats: awayTeamBoxScore._id,
      ...gameData
    });
    logger.info("game created: ", game.id);
    await addGameStats(gameData);
    return false;
  } else {
    logger.info("game exists: ", gameId);
    return true;
  }
}


async function addGameStats(gameData) {
  for (teamStats of gameData.boxScore) {
    for (playerStats of teamStats.playerStats) {
      if (playerStats.player != "totals") {
        const existingPlayer = await Player.findOne({ _id: playerStats.player });
        if (!existingPlayer) {
          // ako je u gameu igrao igrač koji nije dodan u bazu podataka
          await addPlayer(playerStats.player, undefined, {});
        }
        const stats = await BoxScoreStats.create({ ...playerStats });
        const existingStats = await PlayerGameStats.findOne({ game: gameData.id, player: playerStats.player });
        if (!existingStats) {
          const gameStats = await PlayerGameStats.create({
            game: gameData.id,
            player: playerStats.player,
            stats: stats._id,
            team: teamStats.teamId
          });
          logger.info("player game stats created for player: ", playerStats.player.name);
        } else {
          logger.info("player game stats already exist for player: ", playerStats.player.name);
        }
      }
    }
  }
}


async function addTeam(link) {
  const teamData = await scrapeTeam(link);
  await sleep(4000);
  let team = await Team.findOne({ _id: teamData.id });
  if (!team) {
    team = await Team.create({ ...teamData, _id: teamData.id });
    logger.info("team created:", team.name)
  }
  // update ako postoji

  for (playerId of teamData.players) {
    logger.info("adding player: ", playerId);
    await sleep(2000);
    await addPlayer(playerId, teamData.id, { pageColor: teamData.pageColor });
  }

}

async function populateDB() {
  const teamLinks = await getTeamLinks();

  // logger.info("\n scraping teams \n");
  // for (link of teamLinks) {
  //   logger.info(`scraping team: ${link}`)
  //   await addTeam(link);
  // };

  // games
  logger.info("\n scraping games \n");
  for (link of teamLinks) {
    logger.info(`\n scraping games for team: ${link} \n`);
    const teamGames = await getGameLinks(link);
    for (gameLink of teamGames.reverse()) {
      logger.info(`scraping game: ${gameLink}`);
      // ide od novijih prema starijima
      const gameExists = await addGame(gameLink)
      if (!gameExists) {
        await sleep(750);
      }
    }
  };
}








// async function deleteDB() {
//   await BoxScoreStats.deleteMany();
//   await Game.deleteMany();
//   await Player.deleteMany();
//   await PlayerCareerStats.deleteMany();
//   await PlayerGameStats.deleteMany();
//   await Team.deleteMany();
//   await TeamCurrentRoster.deleteMany();
//   logger.info("deleted");
// }


(async function () {
  await populateDB();
  // await addTeam("/team/1610612738/celtics");
  // await addTeam("/team/1610612766/hornets");
  // await addGame("/game/0012200005/");
  // await addPlayer("1631128", "1610612743", "blue");

  // await addTeam("/team/1610612742/mavericks")
  // await addTeam("team/1610612756/suns")
  // await addTeam("/team/1610612758/kings")
  // await addGame("/game/0022200346/");
  logger.info("done");
})();
