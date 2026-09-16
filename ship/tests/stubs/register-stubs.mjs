import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
register('./handler-resolver.mjs', pathToFileURL('./tests/stubs/'))
