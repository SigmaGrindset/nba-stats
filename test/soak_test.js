// reliability tijekom duzeg perioda
// da nema memory leakova,


import http from "k6/http";
import { sleep } from "k6";

export const options = {
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  stages: [
    // 3 stagea
    // ide se do 80-ak% od maksimuma iz stress testa
    { duration: "2m", target: 400 },
    { duration: "3h56m", target: 400 },
    { duration: "2m", target: 0 },
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

