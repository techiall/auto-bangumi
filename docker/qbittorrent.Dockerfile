FROM qbittorrentofficial/qbittorrent-nox:latest

LABEL org.opencontainers.image.description="Official qBittorrent-nox image preconfigured for Auto Bangumi with an internal download file server."

RUN mv /entrypoint.sh /usr/local/bin/qbittorrent-nox-entrypoint \
  && apk add --no-cache nginx

COPY entrypoint.sh /entrypoint.sh
COPY 10-configure-qbittorrent.sh /usr/local/bin/configure-qbittorrent
COPY file-export.nginx.conf /etc/nginx/http.d/file-export.conf

RUN chmod 0555 /entrypoint.sh /usr/local/bin/configure-qbittorrent \
  && rm -f /etc/nginx/http.d/default.conf
