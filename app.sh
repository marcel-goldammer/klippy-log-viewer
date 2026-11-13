. /useremain/rinkhals/.current/tools.sh

# Klippy log viewer for Rinkhals.
#
# Runs no process of its own. "start" copies a static page into the web root
# of the built-in Mainsail app, adds a link to Mainsail's sidebar, and adds
# one script line to Mainsail's index.html so the page opens inside Mainsail.
# Mainsail's lighttpd serves the page and already proxies /server/* to
# Moonraker, which is where the page reads the log from. "stop" undoes all of it.
#
# A Rinkhals update replaces the Mainsail folder; everything is applied again
# the next time this app starts.

APP_ROOT=$(dirname $(realpath $0))

PAGE_NAME=klippy-log.html
MAINSAIL_WEB_ROOT=$RINKHALS_ROOT/home/rinkhals/apps/25-mainsail/mainsail
PAGE_TARGET=$MAINSAIL_WEB_ROOT/$PAGE_NAME

INJECT_NAME=klippy-log-inject.js
INJECT_TARGET=$MAINSAIL_WEB_ROOT/$INJECT_NAME
INJECT_TAG="<script src=\"/$INJECT_NAME\" defer></script>"
MAINSAIL_INDEX=$MAINSAIL_WEB_ROOT/index.html

# Mainsail reads its sidebar links from .theme/navi.json in Moonraker's config folder
NAVI=
for DIR in $RINKHALS_HOME/printer_data/config /userdata/app/gk/printer_data/config; do
    if [ -d "$DIR" ]; then
        NAVI=$DIR/.theme/navi.json
        break
    fi
done

status() {
    if [ -f "$PAGE_TARGET" ]; then
        report_status $APP_STATUS_STARTED
    else
        report_status $APP_STATUS_STOPPED
    fi
}

start() {
    if [ ! -d "$MAINSAIL_WEB_ROOT" ]; then
        log "klippy-log-viewer: Mainsail web root not found at $MAINSAIL_WEB_ROOT"
        return
    fi

    cp "$APP_ROOT/$PAGE_NAME" "$PAGE_TARGET"

    # Embed the page into Mainsail: one script line in its index.html.
    # Without it the sidebar link still opens the standalone page.
    cp "$APP_ROOT/$INJECT_NAME" "$INJECT_TARGET"
    if [ -f "$MAINSAIL_INDEX" ] && ! grep -q "$INJECT_NAME" "$MAINSAIL_INDEX"; then
        sed -i "s#</body>#$INJECT_TAG</body>#" "$MAINSAIL_INDEX"
    fi

    # Sidebar link. An existing navi.json belongs to the user and is left alone.
    # An empty one is what an interrupted write leaves behind, so it is replaced.
    if [ -n "$NAVI" ] && [ ! -s "$NAVI" ]; then
        mkdir -p "$(dirname "$NAVI")"
        cp "$APP_ROOT/navi.json" "$NAVI"
    elif [ -n "$NAVI" ] && ! grep -q "$PAGE_NAME" "$NAVI"; then
        log "klippy-log-viewer: $NAVI already exists, add the entry from $APP_ROOT/navi.json by hand"
    fi

    # Write the copies to flash now. Without this, switching the printer off
    # shortly afterwards leaves them as empty files.
    sync
}

stop() {
    rm -f "$PAGE_TARGET" "$INJECT_TARGET"

    if [ -f "$MAINSAIL_INDEX" ] && grep -q "$INJECT_NAME" "$MAINSAIL_INDEX"; then
        sed -i "s#$INJECT_TAG##" "$MAINSAIL_INDEX"
    fi

    # Remove the sidebar link only if the file is still exactly ours
    if [ -n "$NAVI" ] && cmp -s "$APP_ROOT/navi.json" "$NAVI"; then
        rm -f "$NAVI"
    fi
}

case "$1" in
    status)
        status
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    *)
        echo "Usage: $0 {status|start|stop}" >&2
        exit 1
        ;;
esac
