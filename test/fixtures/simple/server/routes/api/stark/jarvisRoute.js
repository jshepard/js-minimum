const { get, post, gamaLevel } = momentum.decorators

class JarvisRoute extends momentum.Route {

  async status(req, res) {
    return 'Ready'
  }

  async cleanSlateProtocol(req, res) {
    return 'Clean Slate Protocol initiated.'
  }

}

gamaLevel(100)(JarvisRoute)
get('/')(JarvisRoute.prototype, 'status')
post('/')(JarvisRoute.prototype, 'cleanSlateProtocol')

module.exports = JarvisRoute
