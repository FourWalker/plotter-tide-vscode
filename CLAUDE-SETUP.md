# Setup brief for Claude: install Plotter Tide in VS Code on this computer

> Give this file to Claude (Claude Code, in VS Code or the desktop app) on the new laptop and say:
> **"Follow CLAUDE-SETUP.md to install Plotter Tide in my VS Code."**

## What this is

A VS Code extension, not on the Marketplace, that adds:
- **Plotter Tide** (light) and **Plotter Tide Night** (dark) color themes, and
- an optional **animated background**: pen-plotter tide lines drawing themselves in the window's corners. It's
  rendered from the official `plotter-tide.ts` scene in Anthropic's Apache-2.0
  [theme-examples](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/theme-examples) plugin.

Repository: https://github.com/FourWalker/plotter-tide-vscode

## Steps for Claude

1. **Get the package.** Use whichever is available, in this order:
   - It's already here: `dist\plotter-tide-<version>.vsix` in this folder.
   - Latest GitHub release: `gh release download --repo FourWalker/plotter-tide-vscode --pattern "*.vsix" --dir dist`
   - Build it from source (no npm packages; needs Node 22.18+ and Windows PowerShell):
     `node scripts/build-scenes.mjs` then `powershell -ExecutionPolicy Bypass -File scripts\package-vsix.ps1`
2. **Check VS Code's command line:** `code --version`. If `code` isn't on PATH, it's usually at
   `%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd`.
3. **Install:** `code --install-extension "dist\plotter-tide-<version>.vsix" --force`, then confirm that
   `code --list-extensions --show-versions` lists `local.plotter-tide`.
4. **Hand over to the user.** These steps happen inside VS Code, so the user does them:
   - `Ctrl+Shift+P` → **Developer: Reload Window**
   - `Ctrl+K Ctrl+T` → **Plotter Tide** or **Plotter Tide Night**
   - Accept the prompt *"Turn on the animated Plotter Tide background?"* → **Turn on** → **Restart VS Code**.
     Without the prompt, run `Ctrl+Shift+P` → **Plotter Tide: Enable Animated Background**.
   - When VS Code says its installation "appears to be corrupt": that's expected. Gear → **Don't Show Again**.

## How to check it worked

- Patch present: the VS Code `workbench.html` under `<VS Code install>\<commit>\resources\app\out\vs\code\electron-browser\workbench\`
  (older versions: `electron-sandbox`) contains `<!-- plotter-tide:start -->`.
- No patch after the user says they turned it on: look in `%APPDATA%\Code\logs\<latest>\` for `plotter`
  lines. `ExtensionService#_doActivateExtension local.plotter-tide` means the extension loaded. If no error
  follows, the command probably never ran.
- `node scripts/test-patch.js "<path to workbench.html>"` checks Enable/Disable against a temporary copy and never
  touches the real file.

## Known catches

- **Permission denied** when enabling: VS Code is a system-wide install (`C:\Program Files\Microsoft VS Code`).
  The user starts VS Code once with **Run as administrator**, enables the background, then restarts normally.
- **VS Code updates** replace `workbench.html`, so the background vanishes. On the next start the extension asks
  **Install again?**.
- **Uninstall:** run **Plotter Tide: Disable Animated Background** first.
- The overlay covers the whole window, including the Claude Code panel, and lets every click through.
  `plotterTide.background.opacity` (default `0.55`) sets how strong it is.
- Don't change `vendor/theme-examples/plotter-tide.ts`. It's the official source, kept for reference and for
  rebuilding. To refresh it from upstream, download the same path from the repository above, rerun
  `build-scenes.mjs`, and update the commit in `NOTICE`.
