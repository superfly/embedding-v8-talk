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
 * This function bootstraps a context so scripts can some limited i/o. It 
 * defines several function references so v8 functions can call back into 
 * node. We call these "bridge" function on Fly.
 * @param context 
 * @param iso 
 */
function bootstrap(context: ivm.Context, iso: ivm.Isolate): void {
  const jail = context.globalReference()
  jail.setSync('global', jail.derefInto());

  // Isolates are ivm.Reference<Isolate> classes that work on both sides
  // of the bridge.
  jail.setSync('_ivm', ivm);

  // We will create a basic `log` function for the new isolate to use.
  jail.setSync('_log', new ivm.Reference(function (...args) {
    args.unshift("v8:")
    console.log(...args);
  }));

  // And a basic `fetch` function
  jail.setSync('_fetch', new ivm.Reference(handleFetch))

  // This compiles bootstrap.js, the other half of our bridge
  const code = iso.compileScriptSync(fs.readFileSync("./bootstrap.js").toString())

  // and then runs it
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

  // http.get is a built in node library function for making an 
  // http GET request. In real life we'd want to support a bunch of 
  // other method types
  let get = http.get
  const parsedUrl = new URL(url)
  if (parsedUrl.protocol == "https:") {
    get = https.get
  }

  const req = get(url, function (resp) {
    // This is a quick hack to read the full body into a string. In real
    // life people like making requests for 10GB files so we need some way
    // to stream the body back to v8 chunk by chunk.
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
      console.log("node:", v8resp)
      v8resp.body = body
      // This is the v8 callback, we send it null for `this` and an array of
      // arguments to pass to the v8 function. Since there aren't any errors, 
      // the first element in the args array is null.
      callback.apply(null, [null, JSON.stringify(v8resp)])
    })
  })
  req.on("error", (err) => {
    // similar to above, but the array is a single element: just the error 
    // as a string
    callback.apply(null, [err.toString()])
  })
}