const _ = require('lodash')
const colors = require('colors')

let log = console.log.bind(console)

let levels = {
  log:     log,
  fatal:   logLevel(     colors.red('  FATAL:')),
  error:   logLevel(     colors.red('  ERROR:')),
  warn:    logLevel( colors.magenta('   WARN:')),
  debug:   logLevel(  colors.yellow('  DEBUG:')),
  info:    logLevel(    colors.cyan('   INFO:')),
  verbose: logLevel(    colors.grey('VERBOSE:'))
}

function logLevel(prefix) {
  return function (...args) {
    this.log.apply(this.log, [prefix].concat(_.values(args)))
  }
}

module.exports = levels
