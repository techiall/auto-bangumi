#!/bin/sh
set -eu

export QBT_LEGAL_NOTICE="${QBT_LEGAL_NOTICE:-confirm}"
export QBT_WEBUI_PORT="${QBT_WEBUI_PORT:-8080}"

configure-qbittorrent

nginx -t
nginx -g 'daemon off;' &
nginx_pid=$!
qbt_pid=

stop_services() {
  if [ -n "$qbt_pid" ]; then
    kill "$qbt_pid" 2>/dev/null || true
  fi

  kill "$nginx_pid" 2>/dev/null || true
}

trap stop_services INT TERM

/usr/local/bin/qbittorrent-nox-entrypoint "$@" &
qbt_pid=$!

set +e
wait "$qbt_pid"
status=$?
set -e

kill "$nginx_pid" 2>/dev/null || true
wait "$nginx_pid" 2>/dev/null || true

exit "$status"
