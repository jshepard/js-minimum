const _ = require('lodash')
const colors = require('colors')

let log = console.log.bind(console)

let logLevel = (prefix) => {
  return (...args) => {
    momentum.log.apply(momentum.log, [prefix].concat(_.values(args)))
  }
}

module.exports = {
  log:     log,
  fatal:   logLevel(     colors.red('  FATAL:')),
  error:   logLevel(     colors.red('  ERROR:')),
  warn:    logLevel( colors.magenta('   WARN:')),
  debug:   logLevel(  colors.yellow('  DEBUG:')),
  info:    logLevel(    colors.cyan('   INFO:')),
  verbose: logLevel(    colors.grey('VERBOSE:'))
}
