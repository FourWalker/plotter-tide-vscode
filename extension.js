// Plotter Tide for VS Code: two color themes (declared in package.json) plus an optional animated background.
//
// VS Code has no API for background images, so the background works the way the popular "Background" extensions do:
// it adds one <style> block to VS Code's own workbench.html, between two marker comments. "Disable" removes exactly
// that block. VS Code then reports its installation as "corrupt" (a checksum warning; harmless), and an update of
// VS Code replaces workbench.html, so the patch has to be applied again; this extension offers that on startup.
'use strict'

const vscode = require('vscode')
const fs = require('fs')
const path = require('path')

const START = '<!-- plotter-tide:start -->'
const END = '<!-- plotter-tide:end -->'
const STATE_KEY = 'plotterTide.backgroundWanted'

/** workbench.html has moved between VS Code versions; the first one that exists wins. */
const WORKBENCH_CANDIDATES = [
  ['out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'],
  ['out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'],
  ['out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.esm.html'],
  ['out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.esm.html'],
]

function findWorkbenchHtml() {
  for (const parts of WORKBENCH_CANDIDATES) {
    const file = path.join(vscode.env.appRoot, ...parts)
    if (fs.existsSync(file)) return file
  }
  return null
}

function stripPatch(html) {
  // The block is inserted with no whitespace of its own, so removing exactly it restores the file byte for byte.
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`, 'g')
  return html.replace(pattern, '')
}

function isPatched(html) {
  return html.includes(START)
}

/** The scene without its paper sheet, so it can lie over the theme's own background colors as an overlay. */
function sceneDataUri(extensionPath, file) {
  const svg = fs
    .readFileSync(path.join(extensionPath, 'media', file), 'utf8')
    .replace(/<rect width="1600" height="1000" fill="#[0-9a-fA-F]{6}"\/>/, '')
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}

function buildStyle(extensionPath) {
  const config = vscode.workspace.getConfiguration('plotterTide.background')
  const opacity = Math.min(1, Math.max(0.05, Number(config.get('opacity', 0.55))))
  const day = sceneDataUri(extensionPath, 'plotter-tide-day.svg')
  const night = sceneDataUri(extensionPath, 'plotter-tide-night.svg')
  const css = [
    '.monaco-workbench::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:99999;',
    `background-position:center;background-repeat:no-repeat;background-size:cover;opacity:${opacity}}`,
    `.monaco-workbench.vs::after,.monaco-workbench.hc-light::after{background-image:url("${day}")}`,
    `.monaco-workbench.vs-dark::after,.monaco-workbench.hc-black::after{background-image:url("${night}")}`,
  ].join('')
  return `${START}<style id="plotter-tide-background">${css}</style>${END}`
}

function writeWorkbench(file, html) {
  try {
    fs.writeFileSync(file, html, 'utf8')
    return true
  } catch (error) {
    const denied = error && (error.code === 'EPERM' || error.code === 'EACCES')
    vscode.window.showErrorMessage(
      denied
        ? 'Plotter Tide: VS Code\'s install folder is read-only for this user. Close VS Code, start it once with "Run as administrator", run the command again, then restart normally.'
        : `Plotter Tide: could not write ${file}: ${error && error.message}`
    )
    return false
  }
}

async function offerReload(message) {
  const choice = await vscode.window.showInformationMessage(message, 'Restart VS Code')
  if (choice) vscode.commands.executeCommand('workbench.action.reloadWindow')
}

async function enable(context) {
  const file = findWorkbenchHtml()
  if (!file) {
    vscode.window.showErrorMessage(`Plotter Tide: could not find workbench.html under ${vscode.env.appRoot}. This VS Code version is not supported yet.`)
    return
  }
  const html = stripPatch(fs.readFileSync(file, 'utf8'))
  if (!html.includes('</head>')) {
    vscode.window.showErrorMessage('Plotter Tide: workbench.html has an unexpected layout; nothing was changed.')
    return
  }
  const patched = html.replace('</head>', `${buildStyle(context.extensionPath)}</head>`)
  if (!writeWorkbench(file, patched)) return
  await context.globalState.update(STATE_KEY, true)
  await offerReload(
    'Plotter Tide background installed. Reload the window to see it. VS Code may then say its installation is "corrupt": that is expected; choose "Don\'t Show Again".'
  )
}

async function disable(context) {
  await context.globalState.update(STATE_KEY, false)
  const file = findWorkbenchHtml()
  if (!file) return
  const html = fs.readFileSync(file, 'utf8')
  if (!isPatched(html)) {
    vscode.window.showInformationMessage('Plotter Tide background is not installed.')
    return
  }
  if (!writeWorkbench(file, stripPatch(html))) return
  await offerReload('Plotter Tide background removed. Reload the window to finish.')
}

/** After a VS Code update the patch is gone; offer to put it back if the user had it on. */
async function checkAfterUpdate(context) {
  if (!context.globalState.get(STATE_KEY)) return
  const file = findWorkbenchHtml()
  if (!file || isPatched(fs.readFileSync(file, 'utf8'))) return
  const choice = await vscode.window.showInformationMessage(
    'VS Code was updated and the Plotter Tide background was removed. Install it again?',
    'Install again',
    'Turn off'
  )
  if (choice === 'Install again') await enable(context)
  else if (choice === 'Turn off') await context.globalState.update(STATE_KEY, false)
}

const OFFERED_KEY = 'plotterTide.backgroundOffered'

/** The colors alone apply without a command, so the background is easy to miss: offer it once, when a Plotter Tide theme is in use. */
async function offerBackground(context) {
  if (context.globalState.get(OFFERED_KEY) || context.globalState.get(STATE_KEY)) return
  const theme = String(vscode.workspace.getConfiguration('workbench').get('colorTheme') || '')
  if (!theme.startsWith('Plotter Tide')) return
  const choice = await vscode.window.showInformationMessage(
    'Turn on the animated Plotter Tide background? (It changes one VS Code file; you can turn it off any time.)',
    'Turn on',
    'Not now'
  )
  if (!choice) return
  await context.globalState.update(OFFERED_KEY, true)
  if (choice === 'Turn on') await enable(context)
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('plotterTide.enableBackground', () => enable(context)),
    vscode.commands.registerCommand('plotterTide.disableBackground', () => disable(context)),
    vscode.window.onDidChangeActiveColorTheme(() => offerBackground(context).catch(() => {})),
    vscode.workspace.onDidChangeConfiguration(async event => {
      if (!event.affectsConfiguration('plotterTide.background.opacity') || !context.globalState.get(STATE_KEY)) return
      const choice = await vscode.window.showInformationMessage('Apply the new Plotter Tide background opacity?', 'Apply')
      if (choice) await enable(context)
    })
  )
  checkAfterUpdate(context)
    .then(() => offerBackground(context))
    .catch(() => {})
}

function deactivate() {}

module.exports = { activate, deactivate, stripPatch, isPatched }
