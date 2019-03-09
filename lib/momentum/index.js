
const _ = require('lodash')
const bluebird = require('bluebird')
const utils = require('./utils')
const loadConfiguration = require('./configuration')

const MAX_WAIT_TIME = 5000

class Momentum {
  constructor(config = {}) {
    // set up events
    utils.emitterProxy(this)

    this.utils = utils

    bluebird.resolve(config)
      .then((config) => {
        // config may have silenced the log
        let log = _.extend(_.clone(this.utils.log), _.get(config, 'log', {}))
        this.log = _.extend(_.bind(log.log, log), log)

        this.log('****************************')
        this.log('**        Momentum        **')
        this.log('****************************')
        this.log('')

        this.config = config
        loadConfiguration(this)

        this.ready = false
        this.started = false
        this.stopped = false
        this.modules = {}

        // should not take too long to get ready
        let startTimeout = setTimeout(() => {
          if (!this.ready) {
            this.fatal('timeout waiting for Momentum to become ready...')
          }
        }, MAX_WAIT_TIME)

        this.loadModules()
          .then(() => {
            clearTimeout(startTimeout)
            this.ready = true
            this.emit('ready')
          })
          .catch((error) => {
            this.fatal(error)
          })
      })
      .catch(this.fatal)
  }

  async onceReady() {
    if (!this.ready) {
      await this.onceAsync('ready')
    }
  }

  async onceStarted() {
    if (!this.started) {
      await this.onceAsync('start')
    }
  }

  async onceStopped() {
    if (!this.stopped) {
      await this.onceAsync('stop')
    }
  }

  async start() {
    this.emit('before:start')

    await this.onceReady()

    await bluebird.each(_.values(this.modules), async (module) => {
      return module.start()
    })

    this.started = true
    this.stopped = false

    this.emit('start')
  }

  async stop() {
    this.emit('before:stop')

    // one way or another, we're stopping soon
    let stopTimeout = setTimeout(() => {
      this.fatal('timeout waiting for Momentum to stop...')
    }, MAX_WAIT_TIME)

    if (this.ready) {
      await bluebird.each(_.values(this.modules), async (module) => {
        return module.stop()
      })
      this.ready = false
    } else {
      this.log.warn('stop called while Momentum was not ready')
    }

    clearTimeout(stopTimeout)
    this.started = false
    this.stopped = true

    this.emit('stop')
  }

  fatal(error, ...args) {
    this.utils.log.fatal(_.result(error, 'stack', error), ...args)
    process.exit(1)
  }

  async loadModules() {

    this.emit('before:modules:load')
    this.ready = false

    let moduleNames = this.config.modules || this.config.processModules[this.config.processType]
    await bluebird.each(moduleNames, async (moduleName) => {
      let Module = require(`./modules/${moduleName}`)
      let instance = new Module(this)

      this.modules[instance.identity] = instance

      await instance.initialize()
    })

    this.emit('modules:load')
  }

}

module.exports = Momentum