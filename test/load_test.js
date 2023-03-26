// tipican i peak load
// brzo spikea na visoki traffic
// spike - u vrlo kratkom vremenu veliki traffic

import http from "k6/http";
import { sleep } from "k6";


export const options = {
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  stages: [
    // 3 stagea
    { duration: "5m", target: 100 },
    { duration: "10m", target: 100 },
    { duration: "5m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(99)<150"],
  }
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
