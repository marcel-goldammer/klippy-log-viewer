# Klippy Log Viewer for Rinkhals

A small [Rinkhals](https://github.com/jbatonnet/Rinkhals) app that shows the
Klippy log live in the browser, as a page inside Mainsail.

Mainsail only lets you download the log. This app adds a "Klippy Log" entry to
Mainsail's sidebar that opens a live view at `/klippy-log`, with the sidebar
and top bar staying where they are.

- Follows the log as it grows, like `tail -f`
- Filter by text, pause, clear, follow on/off
- Errors and warnings are coloured
- Notices a printer restart and continues with the new log
- Runs **no process on the printer**: no extra memory, no CPU while the page is closed

## Requirements

- A printer running Rinkhals, with SSH access
- The built-in Mainsail app enabled

Tested on an Anycubic Kobra S1 with Mainsail 2.17.0. Other printers supported
by Rinkhals should work but have not been tried.

## Install

From a computer with `ssh` and `tar` (macOS, Linux, WSL):

```sh
git clone https://github.com/marcel-goldammer/klippy-log-viewer.git
cd klippy-log-viewer
sh install.sh <printer-host-or-ip>
```

Without an argument the host is `kobra-s1.local`. The script asks for the
printer's SSH password, copies the app to
`/useremain/home/rinkhals/apps/klippy-log-viewer` and starts it.

Then reload Mainsail. Running `install.sh` again updates an existing installation.

### By hand

Copy `app.sh`, `app.json`, `navi.json`, `klippy-log.html`,
`klippy-log-inject.js` and `.enabled` into
`/useremain/home/rinkhals/apps/klippy-log-viewer/` on the printer, then:

```sh
cd /useremain/home/rinkhals/apps/klippy-log-viewer
chmod +x app.sh
./app.sh start
```

## Uninstall

On the printer:

```sh
/useremain/home/rinkhals/apps/klippy-log-viewer/app.sh stop
rm -rf /useremain/home/rinkhals/apps/klippy-log-viewer
```

`stop` removes everything the app added to Mainsail. Disabling the app in the
Rinkhals menu on the touchscreen does the same without deleting it.

## How it works

`app.sh start` does three things, and `app.sh stop` undoes them:

1. Copies `klippy-log.html` and `klippy-log-inject.js` into the web root of the
   built-in Mainsail app. Mainsail's web server already forwards `/server/*` to
   Moonraker, so the page reads the log from `/server/files/klippy.log` with
   HTTP range requests, every two seconds, only while the tab is visible.
2. Adds one `<script>` line to Mainsail's `index.html`. The script shows the
   page inside Mainsail's content area while the address is `/klippy-log`.
3. Creates `.theme/navi.json` in the printer's config folder, which is where
   Mainsail reads custom sidebar entries from.

A Rinkhals update replaces the Mainsail folder. The app applies its changes
again the next time it starts, which Rinkhals does on every boot.

## Limitations

- **You already have a `navi.json`:** the app does not touch it. Add the entry
  from this repository's `navi.json` to yours by hand.
- **Mainsail updates:** Mainsail has no plugin API, so the embedding relies on
  Mainsail's page structure and may stop working with a future version. The
  sidebar entry then opens the same log view as a standalone page.
- **Mainsail reconnecting:** if Mainsail loses its connection to the printer
  while the log is open, the embedded view may need a page reload afterwards.
- The page keeps the last 5000 lines and loads the last 64 KB of the log when
  opened. Use Mainsail's download for the full file.

## Disclaimer

This app was written with the help of AI (Claude Code). I reviewed the code
and tested it on my own printer. It changes files of the Mainsail app on the
printer; use it at your own risk.

## License

[MIT](LICENSE)
