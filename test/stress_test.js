// stress test - limit sustava
// polako ide do limita

import http from "k6/http";
import { sleep } from "k6";


const rampTime = "1m";
const stableTime = "2m";

export const options = {
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  stages: [
    { duration: rampTime, target: 100 },
    { duration: stableTime, target: 100 },
    { duration: rampTime, target: 200 },
    { duration: stableTime, target: 200 },
    { duration: rampTime, target: 300 },
    { duration: stableTime, target: 300 },
    { duration: rampTime, target: 400 },
    { duration: stableTime, target: 400 },
    { duration: "1m", target: 0 },
  ]
}

const baseURL = "http://localhost:3000";

export default () => {
  http.batch([
    ["GET", `${baseURL}`],
    ["GET", `${baseURL}/teams`],
    ["GET", `${baseURL}/team/1610612738`],
    ["GET", `${baseURL}/player/1628369`],
  ]);

  sleep(1);
}
