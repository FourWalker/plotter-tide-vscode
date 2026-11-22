# Plotter Tide for VS Code

Light and night VS Code color themes after Claude's **Plotter Tide** scene, plus an optional **animated background**:
pen-plotter tide lines that slowly draw and wash away in the corners of the window.

- **Plotter Tide**: warm paper `#f3eee3`, slate ink `#1f2a48`, rust `#c4552d`
- **Plotter Tide Night**: blue-black paper `#141a27`, pale ink `#aab6d0`, rust `#e98a5e`

The background follows the kind of theme that's active: the day scene with light themes, the night scene with dark ones.

> Setting this up on another computer with Claude? Give it [CLAUDE-SETUP.md](CLAUDE-SETUP.md).

## Install

Download `plotter-tide-<version>.vsix` from the
[latest release](https://github.com/FourWalker/plotter-tide-vscode/releases/latest), or build it yourself
(see *Rebuild from source*). Then either:

- In VS Code: **Extensions** view → `···` menu → **Install from VSIX…** → pick the `.vsix`, or
- In a terminal, from the folder holding it:

  ```powershell
  code --install-extension "plotter-tide-1.0.1.vsix"
  ```

Then:

1. **Pick the theme:** `Ctrl+K Ctrl+T` → **Plotter Tide** or **Plotter Tide Night**.
2. **Turn on the moving background (optional):** accept the "Turn on the animated Plotter Tide background?" prompt
   that appears once you pick a Plotter Tide theme, or run `Ctrl+Shift+P` → **Plotter Tide: Enable Animated Background**
   → **Restart VS Code**.
3. VS Code will then say *"Your Code installation appears to be corrupt"*. That's expected (VS Code noticed its
   own file was changed). Click the gear → **Don't Show Again**.

Turn the background off with **Plotter Tide: Disable Animated Background**. Do that **before uninstalling** the
extension, or the background stays until the next VS Code update.

### Settings

- `plotterTide.background.opacity` (default `0.55`): how strongly the lines show. After changing it, accept the
  "Apply" prompt (or run Enable again) and reload.

## How the background works, and its catches

VS Code has no supported way to set a background image. Like the popular "Background" extensions, this one adds
one `<style>` block to VS Code's own `workbench.html` (found from `vscode.env.appRoot`), between
`<!-- plotter-tide:start -->` and `<!-- plotter-tide:end -->` markers. Disable removes exactly that block and
leaves the file byte for byte as it was.

- **VS Code updates** replace that file, so the background disappears. On the next start the extension asks
  **Install again?**.
- **"Permission denied"**: if VS Code was installed for all users (in `Program Files`), its folder is read-only.
  Start VS Code once with **Run as administrator**, run Enable, then restart normally. The default user install
  (`%LOCALAPPDATA%\Programs\Microsoft VS Code`) doesn't need this.
- The overlay sits over the whole window and lets every click through. It also covers panels such as the Claude
  Code chat.
- Motion stops when Windows asks for reduced animations (*Settings → Accessibility → Visual effects → Animation
  effects* off).

## Rebuild from source

Nothing to `npm install`. You need Node 22.18 or newer, and PowerShell.

```powershell
node scripts/build-scenes.mjs
powershell -ExecutionPolicy Bypass -File scripts\package-vsix.ps1
```

- `vendor/theme-examples/plotter-tide.ts`: the official scene source, unmodified (Apache-2.0, see `NOTICE`).
  `build-scenes.mjs` renders it into `media/plotter-tide-day.svg` and `media/plotter-tide-night.svg`.
- `themes/*.json`: the two color themes.
- `extension.js`: the Enable/Disable background commands.
- `scripts/package-vsix.ps1`: builds `dist/plotter-tide-<version>.vsix` (a zip plus a manifest, no `vsce` needed).
- `scripts/test-patch.js`: checks Enable/Disable on a temporary copy of a `workbench.html`:
  `node scripts/test-patch.js "<path to workbench.html>"`

## Credits and license

The animated scene is Anthropic's **Plotter Tide** from the `theme-examples` plugin in
[anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/theme-examples)
(Apache License 2.0). `vendor/theme-examples/plotter-tide.ts` is an unmodified copy of
[`hooks/scenes/plotter-tide.ts`](https://github.com/anthropics/claude-plugins-official/blob/73c8cf3ea7e296057b467990f2f5d61b4c922260/plugins/theme-examples/hooks/scenes/plotter-tide.ts)
at commit `73c8cf3`. The SVGs in `media/` are its output, and the theme colors come from its palette.

Everything here is under the Apache License 2.0 too (see [LICENSE](LICENSE) and [NOTICE](NOTICE)).
This is an independent, unofficial project. Anthropic and Microsoft don't make, endorse or support it.
"Claude" is a trademark of Anthropic, and "Visual Studio Code" is a trademark of Microsoft. They appear here only
to say what this works with and where the scene comes from.
