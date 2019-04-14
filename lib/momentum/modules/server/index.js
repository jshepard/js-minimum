const _ = require('lodash')
const Http = require('http')
const SocketIo = require('socket.io')

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

    this.emit('initialize')
  }

  async start() {
    let momentum = this.momentum
    let config = momentum.config
    let api = momentum.modules.api

    return new Promise((resolve) => {
      this.server = Http.createServer(api.expressHandler())
      this.io = SocketIo(this.server)
      _.each(config.api.wsOrder, (name) => {
        this.io.use(config.middleware[name](momentum))
      })
      api.socketIoHandler(this.io)
      this.emit('before:listen')
      this.server.listen(config.server.port, () => {
        let host = this.server.address().address
        let port = this.server.address().port
        momentum.log('')
        momentum.log(`Momentum listening on http://${host}:${port}`)
        this.emit('listening')
        resolve()
      })
    })

  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.io.close();
        this.server.close(resolve)
        delete this.io
        delete this.server
      } else {
        resolve()
      }
    })
  }

}

module.exports = Server
