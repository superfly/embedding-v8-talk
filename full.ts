#!/usr/bin/env ts-node
import * as ivm from 'isolated-vm'
import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import { URL } from 'url'

const srcFile = process.argv.pop()
if (srcFile == __filename) {
  console.error("Please pass a source javascript to run: ./index.ts <js-file>")
  process.exit(1)
}
const src = fs.readFileSync(srcFile).toString()

const isolate = new ivm.Isolate({ memoryLimit: 128 })

const context = isolate.createContextSync()

bootstrap(context, isolate)

isolate.compileScriptSync(src).runSync(context)

/**
 */
function bootstrap(context: ivm.Context, iso: ivm.Isolate): void {
  const jail = context.globalReference()
  jail.setSync('global', jail.derefInto());
  jail.setSync('_ivm', ivm);
  // We will create a basic `log` function for the new isolate to use.
  jail.setSync('_log', new ivm.Reference(function (...args) {
    args.unshift("v8:")
    console.log(...args);
  }));
  jail.setSync('_fetch', new ivm.Reference(handleFetch))
  jail.setSync('_busy', false)

  const code = iso.compileScriptSync(fs.readFileSync("./bootstrap.js").toString())
  code.runSync(context)

  // node doesn't know when v8 is waiting for promises or callbacks
  // so this is an ugly hack to let examples run, nothing should take more
  // than a few seconds
  setTimeout(() => true, 3000)
}

/**
 * This is a function for handling a `fetch` request from v8
 * @param url A URL to get
 * @param callback a reference to a v8 callback function that takes (err, response)
 */
function handleFetch(url: string, callback: ivm.Reference<Function>) {
  console.log(`native: handleFetch(url="${url}")`)
  let get = http.get
  const parsedUrl = new URL(url)
  if (parsedUrl.protocol == "https:") {
    get = https.get
  }

  const req = get(url, function (resp) {
    let body = ""
    resp.on('data', (chunk) => {
      body += chunk.toString()
    })

    resp.on('end', () => {
      const v8resp = {
        status: resp.statusCode,
        headers: resp.headers,
        body: null
      }
      v8resp.body = body
      callback.apply(null, [null, JSON.stringify(v8resp)])
    })
  })
  req.on("error", (err) => {
    callback.apply(null, [err.toString()])
  })
}