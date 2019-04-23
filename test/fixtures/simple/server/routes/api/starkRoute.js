const { get, post, gamaLevel } = momentum.decorators

class StarkRoute extends momentum.Route {

  async index(req, res) {
    return 'Ready'
  }

  async ceo(req, res) {
    return 'Pepper Potts'
  }

}

get('/')(StarkRoute.prototype, 'index')
get('/ceo')(StarkRoute.prototype, 'ceo')

module.exports = StarkRoute
