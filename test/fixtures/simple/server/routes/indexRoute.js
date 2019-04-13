const {get, wsConnect} = momentum.decorators

class IndexRoute extends momentum.Route {

  index(req, res) {
    return 'Home'
  }

  indexConnect(socket) {
    socket.on('message', (data) => {

    })
  }
}

get()(IndexRoute.prototype, 'index')
wsConnect()(IndexRoute.prototype, 'indexConnect')


module.exports = IndexRoute
