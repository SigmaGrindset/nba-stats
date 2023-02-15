const axios = require("axios");
const BASEURL = "https://www.nba.com";

module.exports.BASEURL = BASEURL;
module.exports.axiosInstance = axios.create({ baseURL: BASEURL });
