#!/usr/bin/env ts-node
import * as ivm from 'isolated-vm'
import * as fs from 'fs'

const srcFile = process.argv.pop()
if (srcFile == __filename) {
  console.error("Please pass a source javascript to run: ./index.ts <js-file>")
  process.exit(1)
}
// load the source from our example js file
const src = fs.readFileSync(srcFile).toString()

// create an isolate, 128mb of memory should be enough for anyone
const isolate = new ivm.Isolate({ memoryLimit: 128 })

// create an execution context for code
const context = isolate.createContextSync()

// compile + run all in one call
isolate.compileScriptSync(src).runSync(context)