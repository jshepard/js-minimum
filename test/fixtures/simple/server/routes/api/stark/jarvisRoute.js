const { get, post, policies } = momentum.decorators

class JarvisRoute extends momentum.Route {

  async status(req, res) {
    return 'Ready'
  }

  async cleanSlateProtocol(req, res) {
    return 'Clean Slate Protocol initiated.'
  }

}

get('/')(JarvisRoute.prototype, 'status')
post('/')(JarvisRoute.prototype, 'cleanSlateProtocol')

module.exports = JarvisRoute
