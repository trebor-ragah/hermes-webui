# Arc HUD — sandbox Docker instructions

Isolated test container for the Arc HUD extension. This does NOT touch your
real Hermes install (`/opt/data/webui`) or your real `~/.hermes` directory —
it runs against fresh, empty Docker volumes on port 8790.

## Start it

    cd /opt/data/spikes/hermes-webui
    docker compose -f docker-compose.arc-hud.yml up -d --build

First boot will show the normal Hermes WebUI first-run onboarding wizard
(it has no agent configured yet, since this is a throwaway sandbox — that's
expected and fine for just eyeballing the skin).

Open: http://localhost:8790

## Turn the HUD skin on/off

Once you're in: Settings (gear icon) -> Appearance -> Skin picker -> "Arc HUD"
(this is the SAME toggle every other skin uses — nothing custom was built for
this, per your request. Switching back to "Default" instantly reverts).

To remove the extension entirely instead of just switching skins:
Settings -> Extensions -> Arc HUD -> Disable/Remove.

## Stop it

    docker compose -f docker-compose.arc-hud.yml down

Add `-v` to also wipe the sandbox's Docker volumes (hermes-home, workspace)
if you want a totally clean slate next time:

    docker compose -f docker-compose.arc-hud.yml down -v

## Once you're happy with it

The extension bundle lives at `extensions-src/arc-hud/` in this repo — it's
just files (extension.json, manifest.json, assets/*.css, assets/*.js). To put
it on your REAL Hermes WebUI (`/opt/data/webui`):

    cp -r extensions-src/arc-hud /opt/data/webui/extensions/arc-hud

Then in your real WebUI: Settings -> Extensions -> it should appear installed
(or use the in-app "Install from local directory" flow if this project's
Settings -> Extensions UI supports that — check there first). Restart is not
required for extensions per docs/EXTENSIONS.md.

Do this copy step yourself, deliberately, after you've reviewed the code and
tried it in the sandboxed container above. Nothing automated pushes this to
your real install.
