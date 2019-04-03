const { get, post, policies } = momentum.decorators
const log = console.log.bind(console)
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
