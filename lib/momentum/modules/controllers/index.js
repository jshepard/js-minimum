const path = require('path')
const _ = require('lodash')
const {Route} = require('./route')
const {Controller} = require('./controller')
const defaultDecorators = require('./decorators')


class Controllers {
  constructor (momentum) {

    momentum.utils.emitterProxy(this, momentum, 'controllers')
    this.momentum = momentum
    this.identity = 'controllers'
    this.globalNames = []
  }

  async initialize () {
    let momentum = this.momentum

    momentum.log('Loading Routes / Controllers...')
    this.emit('before:initialize')

    let paths = momentum.config.paths

    this.globalNames.push('Routes')
    global.Route = Route

    this.globalNames.push('Controller')
    global.Controller = Controller

    momentum.Route = Route
    momentum.routes = {}
    momentum.decorators = defaultDecorators;
    momentum.Controller = Controller
    momentum.controllers = {}

    let decorators = momentum.utils.requireDir({
      dirname: paths.decorators,
      filter: /(.+)Decorator\.(js|coffee|litcoffee)$/,
      flattenDirectories: false
    })
    this.addDecorators(decorators)

    this.policies = momentum.utils.requireDir({
      dirname: paths.policies,
      filter: /(.+)\.(js|coffee|litcoffee)$/,
      flattenDirectories: true
    })

    let routes = momentum.utils.requireDir({
      dirname: paths.routes,
      filter: /(.+)Route\.(js|coffee|litcoffee)$/,
      flattenDirectories: false
    })
    this.addRoutes(routes)


    let controllers = momentum.utils.requireDir({
      dirname: paths.controllers,
      filter: /(.+)Controller\.(js|coffee|litcoffee)$/,
      flattenDirectories: false
    })
    this.addControllers(controllers)

    this.emit('initialize')
  }

  async start() {
    let momentum = this.momentum

    _.each(momentum.routes, (route, routeId) => {
      if (global[route.globalId]) {
        momentum.warn(`Global Route conflict: ${route.globalId} already exists. Skipping`)
      } else {
        this.globalNames.push(route.globalId)
        global[route.globalId] = route
      }
    })

    _.each(momentum.controllers, (controller, controllerId) => {
      if (global[controller.globalId]) {
        momentum.warn(`Global Controller conflict: ${controller.globalId} already exists. Skipping`)
      } else {
        this.globalNames.push(controller.globalId)
        global[controller.globalId] = controller
      }
    })
  }

  async stop() {
    // delete the globals
    _.each(this.globalNames, (globalName) => {
      delete global[globalName]
    })
  }

  addDecorators(decorators) {
    _.extend(momentum.decorators, decorators)
  }

  addRoutes(routes, root = '/') {
    _.each(routes, (AppRoute, routeId) => {
      if (AppRoute.prototype instanceof Route) {
        let route = new AppRoute(routeId,  _.extend({root: root}, AppRoute.options))
        momentum.routes[route.globalId] = route
      } else {
        this.addRoutes(AppRoute, path.join(root, routeId))
      }
    })
  }

  addControllers(controllers, root = '/') {
    _.each(controllers, (AppController, controllerId) => {
      if (AppController.prototype instanceof Controller) {
        let controller = new AppController(controllerId, _.extend({root: root}, AppController.options))
        momentum.controllers[controller.globalId] = controller
      } else {
        this.addControllers(AppController, path.join(root, controllerId))
      }
    })

  }

}

module.exports = Controllers
