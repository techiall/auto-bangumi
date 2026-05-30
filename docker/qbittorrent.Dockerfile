FROM lscr.io/linuxserver/qbittorrent:latest

LABEL org.opencontainers.image.description="qBittorrent image preconfigured for Auto Bangumi with an internal download file server."

RUN apk add --no-cache nginx

COPY 10-configure-qbittorrent.sh /custom-cont-init.d/10-configure-qbittorrent.sh
COPY file-export.nginx.conf /etc/nginx/http.d/file-export.conf
COPY svc-file-export.run /etc/s6-overlay/s6-rc.d/svc-file-export/run

RUN chmod 0555 /custom-cont-init.d/10-configure-qbittorrent.sh \
  && chmod 0555 /etc/s6-overlay/s6-rc.d/svc-file-export/run \
  && printf 'longrun\n' > /etc/s6-overlay/s6-rc.d/svc-file-export/type \
  && touch /etc/s6-overlay/s6-rc.d/user/contents.d/svc-file-export \
  && rm -f /etc/nginx/http.d/default.conf
