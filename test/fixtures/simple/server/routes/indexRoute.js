const {get} = momentum.decorators

class IndexRoute extends momentum.Route {

  index(req, res) {
    return 'Home'
  }

}

get()(IndexRoute.prototype, 'index')

module.exports = IndexRoute
