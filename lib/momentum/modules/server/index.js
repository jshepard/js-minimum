const _ = require('lodash')
const Express = require('express')

class Server {
  constructor (momentum) {

    momentum.utils.emitterProxy(this, momentum, 'server')
    this.momentum = momentum
    this.identity = 'server'
    this.globalNames = []
  }

  async initialize () {
    let momentum = this.momentum

    momentum.log('Loading Server...')
    this.emit('before:initialize')

    this.app = new Express()
    let config = momentum.config

    this.app.set('x-powered-by', false)
    this.app.set('views', [config.paths.views])
    this.app.set('jsonp callback name', config.routes.jsonp)

    this.emit('initialize')
  }

  async start() {
    let momentum = this.momentum
    let config = momentum.config
    let api = momentum.modules.api

    return new Promise((resolve) => {
      this.app.use(api.expressHandler())
      let server = this.app.listen(config.server.port, () => {
        let host = server.address().address
        let port = server.address().port
        momentum.log('')
        momentum.log(`Momentum listening on http://${host}:${port}`)
        this.emit('listening')
        resolve()
      })
      this.server = server
    })

  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve)
        delete this.server
      } else {
        resolve()
      }
    })
  }

}

module.exports = Server
