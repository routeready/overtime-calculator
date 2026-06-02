# launchd Setup

## Install the Mining Bible server service

1. Copy the plist to the LaunchDaemons directory:
   ```bash
   sudo cp io.mineready.bible.server.plist /Library/LaunchDaemons/
   sudo chown root:wheel /Library/LaunchDaemons/io.mineready.bible.server.plist
   sudo chmod 644 /Library/LaunchDaemons/io.mineready.bible.server.plist
   ```

2. Update the `WorkingDirectory` in the plist to match your actual project path.

3. Create the log directory:
   ```bash
   sudo mkdir -p /var/log/mining-bible
   sudo chown routeready:staff /var/log/mining-bible
   ```

4. Load the service:
   ```bash
   sudo launchctl load /Library/LaunchDaemons/io.mineready.bible.server.plist
   ```

5. Check it's running:
   ```bash
   sudo launchctl list | grep mineready
   curl http://localhost:8001/health
   ```

## Manage the service

```bash
# Restart
sudo launchctl unload /Library/LaunchDaemons/io.mineready.bible.server.plist
sudo launchctl load /Library/LaunchDaemons/io.mineready.bible.server.plist

# View logs
tail -f /var/log/mining-bible/server.log
tail -f /var/log/mining-bible/server-error.log

# Stop
sudo launchctl unload /Library/LaunchDaemons/io.mineready.bible.server.plist
```

## Cloudflare Tunnel

The existing tunnel (ID: 820d8f7c) needs a new ingress rule for Mining Bible.

Edit the tunnel config at `~/.cloudflared/config.yml` and add:

```yaml
ingress:
  # ... existing rules for port 8000 (Tool 4) ...
  - hostname: mineready.io
    service: http://localhost:8001
  - service: http_status:404
```

Then restart the tunnel:
```bash
sudo launchctl unload /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

**Do not recreate the tunnel** — only update the ingress config.

## IMPORTANT: Do not touch port 8000 or Tool 4's launchd plist.
