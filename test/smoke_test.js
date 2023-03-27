// tipican i peak load
// brzo spikea na visoki traffic
// spike - u vrlo kratkom vremenu veliki traffic

import http from "k6/http";
import { sleep } from "k6";


export const options = {
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  vus: 1,
  duration:"1m",
  thresholds: {
    http_req_duration: ["p(99)<500"],
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
