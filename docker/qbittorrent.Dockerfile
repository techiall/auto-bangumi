FROM lscr.io/linuxserver/qbittorrent:latest

RUN apk add --no-cache nginx

COPY docker/qbittorrent/10-configure-qbittorrent.sh /custom-cont-init.d/10-configure-qbittorrent.sh
COPY docker/qbittorrent/file-export.nginx.conf /etc/nginx/http.d/file-export.conf
COPY docker/qbittorrent/svc-file-export.run /etc/s6-overlay/s6-rc.d/svc-file-export/run

RUN chmod 0555 /custom-cont-init.d/10-configure-qbittorrent.sh \
  && chmod 0555 /etc/s6-overlay/s6-rc.d/svc-file-export/run \
  && printf 'longrun\n' > /etc/s6-overlay/s6-rc.d/svc-file-export/type \
  && touch /etc/s6-overlay/s6-rc.d/user/contents.d/svc-file-export \
  && rm -f /etc/nginx/http.d/default.conf
