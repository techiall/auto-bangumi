#!/usr/bin/with-contenv sh
set -eu

config_file=/config/qBittorrent/qBittorrent.conf
password_hash='@ByteArray(YXV0by1iYW5ndW1pLXNhbA==:I1QozK7rFTwrsqgQC3bcZdCFSDi4h2lu+mReHz7fPa++Whd73lKo+lxsbR9W0R9E+6stXlzMzqB2iA06bvHbxg==)'
max_active_downloads=20
max_ratio=1
max_seeding_minutes=60

mkdir -p /config/qBittorrent
rm -f /config/qBittorrent/lockfile

if [ ! -f "$config_file" ]; then
  cat > "$config_file" <<'EOF'
[LegalNotice]
Accepted=true

[BitTorrent]
Session\GlobalMaxRatio=1
Session\GlobalMaxSeedingMinutes=60
Session\MaxActiveDownloads=20
Session\MaxActiveTorrents=20
Session\QueueingSystemEnabled=true
Session\ShareLimitAction=Stop

[Preferences]
Connection\UPnP=false
Connection\PortRangeMin=6881
Downloads\SavePath=/downloads/
Downloads\TempPath=/downloads/incomplete/
WebUI\Address=*
WebUI\ServerDomains=*
EOF
fi

set_config_value() {
  section=$1
  key=$2
  value=$3
  tmp_file="${config_file}.tmp"

  awk -v section="$section" -v key="$key" -v value="$value" '
    BEGIN { in_section = 0; done = 0; header = "[" section "]" }
    $0 == header { print; in_section = 1; next }
    /^\[/ && in_section {
      if (!done) {
        print key "=" value
        done = 1
      }
      in_section = 0
    }
    in_section && index($0, key "=") == 1 {
      print key "=" value
      done = 1
      next
    }
    { print }
    END {
      if (!done) {
        if (!in_section) {
          print ""
          print header
        }
        print key "=" value
      }
    }
  ' "$config_file" > "$tmp_file"

  mv "$tmp_file" "$config_file"
}

remove_config_value() {
  section=$1
  key=$2
  tmp_file="${config_file}.tmp"

  awk -v section="$section" -v key="$key" '
    BEGIN { in_section = 0; header = "[" section "]" }
    $0 == header { print; in_section = 1; next }
    /^\[/ && in_section { in_section = 0 }
    in_section && index($0, key "=") == 1 { next }
    { print }
  ' "$config_file" > "$tmp_file"

  mv "$tmp_file" "$config_file"
}

set_preference() {
  key=$1
  value=$2
  set_config_value 'Preferences' "$key" "$value"
}

remove_config_value 'Preferences' 'Session\\GlobalMaxRatio'
remove_config_value 'Preferences' 'Session\\GlobalMaxSeedingMinutes'
remove_config_value 'Preferences' 'Session\\ShareLimitAction'
remove_config_value 'Preferences' 'DownloadsSavePath'
remove_config_value 'Preferences' 'WebUIAddress'
remove_config_value 'Preferences' 'WebUIPassword_PBKDF2'
remove_config_value 'Preferences' 'WebUIPort'
remove_config_value 'Preferences' 'WebUIServerDomains'
remove_config_value 'Preferences' 'WebUIUsername'
remove_config_value 'BitTorrent' 'SessionGlobalMaxRatio'
remove_config_value 'BitTorrent' 'SessionGlobalMaxSeedingMinutes'
remove_config_value 'BitTorrent' 'SessionShareLimitAction'

set_config_value 'BitTorrent' 'Session\\GlobalMaxRatio' "$max_ratio"
set_config_value 'BitTorrent' 'Session\\GlobalMaxSeedingMinutes' "$max_seeding_minutes"
set_config_value 'BitTorrent' 'Session\\MaxActiveDownloads' "$max_active_downloads"
set_config_value 'BitTorrent' 'Session\\MaxActiveTorrents' "$max_active_downloads"
set_config_value 'BitTorrent' 'Session\\QueueingSystemEnabled' 'true'
set_config_value 'BitTorrent' 'Session\\ShareLimitAction' 'Stop'
set_preference 'Downloads\\SavePath' '/downloads/'
set_preference 'WebUI\\Address' '*'
set_preference 'WebUI\\Password_PBKDF2' "\"${password_hash}\""
set_preference 'WebUI\\Port' '8080'
set_preference 'WebUI\\ServerDomains' '*'
set_preference 'WebUI\\Username' 'admin'

echo '[custom-init] qBittorrent WebUI credentials, queueing, and seeding limits configured'
