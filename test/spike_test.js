// brzo spikea na visoki traffic
// spike - u vrlo kratkom vremenu veliki traffic

import http from "k6/http";
import { sleep } from "k6";


export const options = {
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  stages: [
    // warmup
    { duration: "10s", target: 100 },
    { duration: "1m", target: 100 },
    // spike
    { duration: "10s", target: 1000 },
    { duration: "3m", target: 1000 },
    // cooldown
    { duration: "10s", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "10s", target: 0 },
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
