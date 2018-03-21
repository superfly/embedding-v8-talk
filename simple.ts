#!/usr/bin/env ts-node
import * as ivm from 'isolated-vm'
import * as fs from 'fs'

const srcFile = process.argv.pop()
if (srcFile == __filename) {
  console.error("Please pass a source javascript to run: ./index.ts <js-file>")
  process.exit(1)
}
const src = fs.readFileSync(srcFile).toString()

const isolate = new ivm.Isolate({ memoryLimit: 128 })

const context = isolate.createContextSync()

isolate.compileScriptSync(src).runSync(context)