const _ = require('lodash')

class Globals {
  constructor (momentum) {

    momentum.utils.emitterProxy(this, momentum, 'globals')
    this.momentum = momentum
    this.identity = 'globals'
  }

  async initialize () {
    let momentum = this.momentum
    let globals = momentum.config.globals

    momentum.log('Loading Globals...')
    this.emit('before:initialize')

    global.momentum = momentum

    _.each(globals, (npmModuleName, name) => {
      global[name] = require(npmModuleName)
    })

    this.emit('initialize')
  }

  async start() {
    // nothing to start
  }

  async stop() {
    let globals = this.momentum.config.globals

    _.each(globals, (npmModuleName, name) => {
      delete global[name]
    })

    delete global.momentum
  }

}

module.exports = Globals
