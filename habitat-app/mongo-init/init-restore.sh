#!/bin/bash
# Runs automatically via docker-entrypoint-initdb.d on the FIRST start of the
# mongodb container only (i.e. when /data/db is empty). It will not re-run or
# overwrite data on subsequent restarts, so it's safe to leave in place.
set -e

if [ -d /docker-entrypoint-initdb.d/dump ] && [ -n "$(ls -A /docker-entrypoint-initdb.d/dump 2>/dev/null)" ]; then
  echo "init-restore: restoring habitat_db from /docker-entrypoint-initdb.d/dump"
  mongorestore --db habitat_db /docker-entrypoint-initdb.d/dump
  echo "init-restore: restore complete"
else
  echo "init-restore: no dump found at /docker-entrypoint-initdb.d/dump, skipping restore"
fi
