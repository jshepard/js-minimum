const {get} = momentum.decorators

class IndexRoute extends momentum.Route {

  index(req, res) {
    res.send('Welcome to Momentum!')
  }

}

get()(IndexRoute.prototype, 'index')

module.exports = IndexRoute
