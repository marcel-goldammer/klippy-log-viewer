#!/bin/sh
# Copies the app to the printer and starts it. Asks for the printer's SSH password once.
# The "sync" matters: the printer does not write new files to flash on its own
# for a long time, and switching it off before that leaves them empty.
# Usage: sh install.sh [host]      (default host: kobra-s1.local)

HOST=${1:-kobra-s1.local}
APP=klippy-log-viewer
DEST=/useremain/home/rinkhals/apps/$APP

cd "$(dirname "$0")" || exit 1

COPYFILE_DISABLE=1 tar -cf - app.sh app.json navi.json klippy-log.html klippy-log-inject.js .enabled \
    | ssh "root@$HOST" "if [ -x $DEST/app.sh ]; then $DEST/app.sh stop; fi; mkdir -p $DEST && tar -C $DEST -xf - && chmod +x $DEST/app.sh && $DEST/app.sh start && sync && $DEST/app.sh status"

if [ $? -eq 0 ]; then
    echo
    echo "Installed. Reload Mainsail and open \"Klippy Log\" in the sidebar, or go to http://$HOST/klippy-log"
else
    echo
    echo "Installation failed." >&2
    exit 1
fi
