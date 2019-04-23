const { get, post, gamaLevel } = momentum.decorators

class StarkRoute extends momentum.Route {

  async index(req, res) {
    return 'Ready'
  }

  async ceo(req, res) {
    return 'Pepper Potts'
  }

  async jarvis(req, res) {
    return 'NOT FOUND'
  }

}

get('/')(StarkRoute.prototype, 'index')
get('/ceo')(StarkRoute.prototype, 'ceo')
get('/jarvis')(StarkRoute.prototype, 'jarvis')

module.exports = StarkRoute
