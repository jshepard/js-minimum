const _ = require('lodash')
const bluebird = require('bluebird')

class Services {
  constructor(momentum) {

    momentum.utils.emitterProxy(this, momentum, 'services')
    this.momentum = momentum
    this.identity = 'services'
    this.globalNames = []
    momentum.services = {}
  }

  async initialize() {
    let momentum = this.momentum

    momentum.log('Loading Services...')
    this.emit('before:initialize')

    let paths = momentum.config.paths

    let services = momentum.utils.requireDir({
      dirname: paths.services,
      filter: /(.+)Service\.(js|coffee|litcoffee)$/,
      flattenDirectories: true
    })

    // resolve any services that returned promises
    services = await bluebird.props(services)
    _.each(services, (service, name) => {
      let globalName = `${name}Service`
      momentum.services[globalName] = service
    })

    this.emit('initialize')
  }

  async start() {
    let momentum = this.momentum
    _.each(momentum.services, (service, name) => {
      this.globalNames.push(name)
      global[name] = service
    })
  }

  async stop() {
    // delete the globals
    _.each(this.globalNames, (globalName) => {
      delete global[globalName]
    })
  }

}

module.exports = Services
