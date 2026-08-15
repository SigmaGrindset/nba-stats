#!/usr/bin/env bash
# Open a mongosh shell against the cluster defined in .env
set -euo pipefail
source .env
mongosh "$MONGO_URI"
