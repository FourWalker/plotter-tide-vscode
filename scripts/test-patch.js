// Checks the enable/disable patch on a temporary copy of a workbench.html, using a fake VS Code API.
// Nothing in the real VS Code install is touched.   node scripts/test-patch.js <path-to-a-workbench.html>
'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const Module = require('module')
const assert = require('assert')

const source = process.argv[2]
if (!source) throw new Error('usage: node scripts/test-patch.js <workbench.html>')

const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'plotter-tide-test-'))
const htmlDir = path.join(appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench')
fs.mkdirSync(htmlDir, { recursive: true })
const htmlFile = path.join(htmlDir, 'workbench.html')
// The source may be a live install that already carries the patch: start from the file as VS Code shipped it.
const shipped = fs.readFileSync(source, 'utf8').replace(/<!-- plotter-tide:start -->[\s\S]*?<!-- plotter-tide:end -->/g, '')
fs.writeFileSync(htmlFile, shipped, 'utf8')
const original = fs.readFileSync(htmlFile, 'utf8')

// The real install's product.json (six levels above workbench.html), so the checksum update is checked too.
const sourceProduct = path.join(path.dirname(source), '..', '..', '..', '..', '..', 'product.json')
const productFile = path.join(appRoot, 'product.json')
const hasProduct = fs.existsSync(sourceProduct)
if (hasProduct) fs.copyFileSync(sourceProduct, productFile)
const originalProduct = hasProduct ? fs.readFileSync(productFile, 'utf8') : ''
const checksumKey = 'vs/code/electron-browser/workbench/workbench.html'
const sha = file => require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('base64').replace(/=+$/, '')
const listed = () => JSON.parse(fs.readFileSync(productFile, 'utf8')).checksums[checksumKey]

const state = new Map()
const messages = []
const fakeVscode = {
  env: { appRoot },
  workspace: { getConfiguration: () => ({ get: (_key, fallback) => fallback }), onDidChangeConfiguration: () => ({}) },
  window: {
    showInformationMessage: async message => { messages.push(message); return undefined },
    showErrorMessage: async message => { messages.push(`ERROR ${message}`); return undefined },
    onDidChangeActiveColorTheme: () => ({}),
  },
  commands: { registerCommand: (id, run) => ({ id, run }), executeCommand: () => {} },
}
const load = Module._load
Module._load = function (request, ...rest) { return request === 'vscode' ? fakeVscode : load.call(this, request, ...rest) }

const extension = require('../extension.js')
const commands = {}
const context = {
  extensionPath: path.join(__dirname, '..'),
  globalState: { get: key => state.get(key), update: async (key, value) => state.set(key, value) },
  subscriptions: { push: (...items) => items.forEach(item => item.id && (commands[item.id] = item.run)) },
}

;(async () => {
  extension.activate(context)
  await commands['plotterTide.enableBackground']()
  const once = fs.readFileSync(htmlFile, 'utf8')
  assert(extension.isPatched(once), 'patch missing after enable')
  assert(once.indexOf('plotter-tide:start') < once.indexOf('</head>'), 'patch is not inside <head>')
  assert(!/fill="#f3eee3"\/>/.test(Buffer.from(once.match(/base64,([^"]+)/)[1], 'base64').toString()), 'paper rect not stripped')

  if (hasProduct) assert.strictEqual(listed(), sha(htmlFile), 'product.json checksum not updated after enable')

  await commands['plotterTide.enableBackground']()
  const twice = fs.readFileSync(htmlFile, 'utf8')
  assert.strictEqual((twice.match(/plotter-tide:start/g) || []).length, 1, 'enabling twice duplicated the patch')

  await commands['plotterTide.disableBackground']()
  assert.strictEqual(fs.readFileSync(htmlFile, 'utf8'), original, 'disable did not restore the original byte for byte')
  if (hasProduct) assert.strictEqual(fs.readFileSync(productFile, 'utf8'), originalProduct, 'disable did not restore product.json byte for byte')

  fs.rmSync(appRoot, { recursive: true, force: true })
  console.log(`ok: patch ${(once.length - original.length) / 1024 | 0} KB, idempotent, fully reversible; checksum ${hasProduct ? 'kept in sync' : 'not checked (no product.json)'}`)
  console.log(messages.map(m => `  - ${m.slice(0, 90)}`).join('\n'))
})().catch(error => { console.error(error); process.exit(1) })
