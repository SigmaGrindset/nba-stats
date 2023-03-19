# Details

Date : 2023-03-19 13:38:50

Directory d:\\Antonio\\nba-stats\\src

Total : 76 files,  5889 codes, 79 comments, 803 blanks, all 6771 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [src/app.js](/src/app.js) | JavaScript | 45 | 1 | 14 | 60 |
| [src/config/logger.js](/src/config/logger.js) | JavaScript | 25 | 2 | 5 | 32 |
| [src/controllers/apiController.js](/src/controllers/apiController.js) | JavaScript | 105 | 1 | 12 | 118 |
| [src/controllers/gameController.js](/src/controllers/gameController.js) | JavaScript | 27 | 0 | 4 | 31 |
| [src/controllers/playerController.js](/src/controllers/playerController.js) | JavaScript | 20 | 0 | 6 | 26 |
| [src/controllers/searchController.js](/src/controllers/searchController.js) | JavaScript | 47 | 0 | 11 | 58 |
| [src/controllers/teamController.js](/src/controllers/teamController.js) | JavaScript | 22 | 0 | 6 | 28 |
| [src/db.js](/src/db.js) | JavaScript | 136 | 18 | 29 | 183 |
| [src/middleware/apiMiddleware.js](/src/middleware/apiMiddleware.js) | JavaScript | 7 | 0 | 2 | 9 |
| [src/models/BoxScoreStats.js](/src/models/BoxScoreStats.js) | JavaScript | 33 | 0 | 6 | 39 |
| [src/models/Game.js](/src/models/Game.js) | JavaScript | 59 | 0 | 4 | 63 |
| [src/models/Player.js](/src/models/Player.js) | JavaScript | 85 | 0 | 9 | 94 |
| [src/models/PlayerCareerStats.js](/src/models/PlayerCareerStats.js) | JavaScript | 140 | 4 | 11 | 155 |
| [src/models/PlayerGameStats.js](/src/models/PlayerGameStats.js) | JavaScript | 32 | 0 | 4 | 36 |
| [src/models/Team.js](/src/models/Team.js) | JavaScript | 89 | 0 | 5 | 94 |
| [src/models/TeamCurrentRoster.js](/src/models/TeamCurrentRoster.js) | JavaScript | 34 | 1 | 7 | 42 |
| [src/public/assets/cake_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/cake_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/flag_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/flag_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/groups_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/groups_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/hail_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/hail_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/height_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/height_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/info_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/info_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/info_FILL0_wght500_GRAD0_opsz48.svg](/src/public/assets/info_FILL0_wght500_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/insights_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/insights_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/location_on_FILL0_wght500_GRAD0_opsz48.svg](/src/public/assets/location_on_FILL0_wght500_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/logo.svg](/src/public/assets/logo.svg) | SVG | 414 | 1 | 1 | 416 |
| [src/public/assets/person_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/person_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/school_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/school_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/search_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/search_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/wave-haikei.svg](/src/public/assets/wave-haikei.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/weight_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/weight_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/assets/workspace_premium_FILL0_wght400_GRAD0_opsz48.svg](/src/public/assets/workspace_premium_FILL0_wght400_GRAD0_opsz48.svg) | SVG | 1 | 0 | 0 | 1 |
| [src/public/css/index.css](/src/public/css/index.css) | CSS | 10 | 0 | 2 | 12 |
| [src/public/css/page/errors.css](/src/public/css/page/errors.css) | CSS | 128 | 0 | 2 | 130 |
| [src/public/css/page/game.css](/src/public/css/page/game.css) | CSS | 392 | 3 | 8 | 403 |
| [src/public/css/page/home.css](/src/public/css/page/home.css) | CSS | 237 | 0 | 2 | 239 |
| [src/public/css/page/player.css](/src/public/css/page/player.css) | CSS | 370 | 0 | 3 | 373 |
| [src/public/css/page/search.css](/src/public/css/page/search.css) | CSS | 153 | 0 | 3 | 156 |
| [src/public/css/page/team.css](/src/public/css/page/team.css) | CSS | 510 | 3 | 6 | 519 |
| [src/public/css/page/teams.css](/src/public/css/page/teams.css) | CSS | 156 | 0 | 2 | 158 |
| [src/public/js/menu.js](/src/public/js/menu.js) | JavaScript | 19 | 0 | 11 | 30 |
| [src/public/scss/_animation.scss](/src/public/scss/_animation.scss) | SCSS | 0 | 0 | 1 | 1 |
| [src/public/scss/_breakpoints.scss](/src/public/scss/_breakpoints.scss) | SCSS | 10 | 0 | 2 | 12 |
| [src/public/scss/_colors.scss](/src/public/scss/_colors.scss) | SCSS | 4 | 0 | 1 | 5 |
| [src/public/scss/_utils.scss](/src/public/scss/_utils.scss) | SCSS | 17 | 0 | 4 | 21 |
| [src/public/scss/_variables.scss](/src/public/scss/_variables.scss) | SCSS | 5 | 0 | 1 | 6 |
| [src/public/scss/components/_info_card.scss](/src/public/scss/components/_info_card.scss) | SCSS | 100 | 4 | 23 | 127 |
| [src/public/scss/components/_menu.scss](/src/public/scss/components/_menu.scss) | SCSS | 64 | 0 | 20 | 84 |
| [src/public/scss/components/_nav.scss](/src/public/scss/components/_nav.scss) | SCSS | 78 | 1 | 27 | 106 |
| [src/public/scss/components/_stats_table.scss](/src/public/scss/components/_stats_table.scss) | SCSS | 109 | 0 | 28 | 137 |
| [src/public/scss/index.scss](/src/public/scss/index.scss) | SCSS | 10 | 0 | 3 | 13 |
| [src/public/scss/page/errors.scss](/src/public/scss/page/errors.scss) | SCSS | 43 | 0 | 13 | 56 |
| [src/public/scss/page/game.scss](/src/public/scss/page/game.scss) | SCSS | 105 | 1 | 37 | 143 |
| [src/public/scss/page/home.scss](/src/public/scss/page/home.scss) | SCSS | 160 | 3 | 44 | 207 |
| [src/public/scss/page/player.scss](/src/public/scss/page/player.scss) | SCSS | 186 | 1 | 54 | 241 |
| [src/public/scss/page/search.scss](/src/public/scss/page/search.scss) | SCSS | 70 | 0 | 19 | 89 |
| [src/public/scss/page/team.scss](/src/public/scss/page/team.scss) | SCSS | 142 | 0 | 37 | 179 |
| [src/public/scss/page/teams.scss](/src/public/scss/page/teams.scss) | SCSS | 73 | 0 | 20 | 93 |
| [src/routes/apiRoutes.js](/src/routes/apiRoutes.js) | JavaScript | 18 | 1 | 7 | 26 |
| [src/routes/gameRoutes.js](/src/routes/gameRoutes.js) | JavaScript | 5 | 0 | 4 | 9 |
| [src/routes/playerRoutes.js](/src/routes/playerRoutes.js) | JavaScript | 5 | 0 | 4 | 9 |
| [src/routes/searchRoutes.js](/src/routes/searchRoutes.js) | JavaScript | 7 | 1 | 4 | 12 |
| [src/routes/teamRoutes.js](/src/routes/teamRoutes.js) | JavaScript | 6 | 0 | 4 | 10 |
| [src/scrape/games.js](/src/scrape/games.js) | JavaScript | 128 | 13 | 24 | 165 |
| [src/scrape/main.js](/src/scrape/main.js) | JavaScript | 4 | 0 | 2 | 6 |
| [src/scrape/players.js](/src/scrape/players.js) | JavaScript | 143 | 7 | 39 | 189 |
| [src/scrape/teams.js](/src/scrape/teams.js) | JavaScript | 151 | 8 | 23 | 182 |
| [src/utils/scrape_utils.js](/src/utils/scrape_utils.js) | JavaScript | 61 | 2 | 12 | 75 |
| [src/views/errors/error.ejs](/src/views/errors/error.ejs) | HTML | 25 | 0 | 10 | 35 |
| [src/views/game_details.ejs](/src/views/game_details.ejs) | HTML | 171 | 1 | 23 | 195 |
| [src/views/home.ejs](/src/views/home.ejs) | HTML | 57 | 0 | 15 | 72 |
| [src/views/partials/nav.ejs](/src/views/partials/nav.ejs) | HTML | 10 | 0 | 2 | 12 |
| [src/views/player_details.ejs](/src/views/player_details.ejs) | HTML | 208 | 0 | 23 | 231 |
| [src/views/search.ejs](/src/views/search.ejs) | HTML | 57 | 0 | 19 | 76 |
| [src/views/team_details.ejs](/src/views/team_details.ejs) | HTML | 174 | 2 | 42 | 218 |
| [src/views/teams.ejs](/src/views/teams.ejs) | HTML | 173 | 0 | 37 | 210 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)