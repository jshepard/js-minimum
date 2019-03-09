const _ = require('lodash')
const colors = require('colors')
const Express = require('express')
const OpenAPIBackend = require('openapi-backend').OpenAPIBackend
const awsServerlessExpress = require('aws-serverless-express')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

class Api {
  constructor (momentum) {

    momentum.utils.emitterProxy(this, momentum, 'api')
    this.momentum = momentum
    this.identity = 'api'
    this.globalNames = []
  }

  async initialize () {
    let momentum = this.momentum

    momentum.log('Loading API...')
    this.emit('before:initialize')

    let config = momentum.config

    this.openApi = {
      definition: _.cloneDeep(config.api.definition) || {},
      handlers: _.cloneDeep(config.api.handlers) || {},
    }

    let definition = this.openApi.definition
    definition.paths = definition.paths || {}

    this.app = new Express()
    this.app.set('x-powered-by', false)
    this.app.set('views', [config.paths.views])
    this.app.set('jsonp callback name', config.api.jsonp)

    _.each(config.viewEngines, (engine, extension) => {
      this.app.engine(extension, engine(momentum))
    })

    this.loadMiddleware()

    this.emit('initialize')
  }

  async start() {
    let momentum = this.momentum
    let handlers = this.openApi.handlers
    let paths = this.openApi.definition.paths

    _.each(momentum.routes, (route, routeId) => {
      _.extend(paths, route.getApiPaths())
      _.extend(handlers, route.getApiHandlers())
    })

    _.each(momentum.controllers, (controller, controllerId) => {
      _.extend(paths, controller.getApiPaths())
      _.extend(handlers, controller.getApiHandlers())
    })

    _.each(paths, (pathConfig, path) => {
      _.each(pathConfig, (config, verb) => {
        this.logRouteConfig(verb, path, config)
      })
    })

    this.backend = new OpenAPIBackend(this.openApi)
  }

  expressHandler() {
    return (req, res) => {
      this.app(req, res)
    }
  }

  awsHandler() {
    this.server = this.server || awsServerlessExpress.createServer(this.app)
    return (event, context) => {
      awsServerlessExpress.proxy(server, event, context)
    }
  }

  loadMiddleware() {
    let momentum = this.momentum
    let config = momentum.config
    let order = _.get(config, 'api.order')

    let requestHandler = () => {
      return (req, res) => {
        this.backend.handleRequest(req, req, res).catch( e => {
          res.sendStatus(404)
        })
      }
    }

    let router = new Express.Router()
    let middleware = _.extend({}, config.middleware, {router: requestHandler})

    _.each(order, (id) => {
      if (middleware[id]) {
        router.use(middleware[id](momentum))
      }
    })

    this.app.use(router)
  }

  logRouteConfig(verb, path, config) {
    let verbs = ['get', 'put', 'post', 'delete', 'patch']
    if (!_.includes(verbs, verb)) {
      return
    }
    let operationId = config.operationId;
    let routeId = operationId.split('#')[0]
    let key = operationId.split('#')[1]
    let route = this.momentum.routes[routeId] || this.momentum.controllers[routeId]
    let policyNames = route.getPolicies(key)
    let indentSize = 2
    let verbSize = 10
    let indent = _.padStart('', indentSize)
    let space = _.pad('', 0)
    let maxVerbLength = _(verbs).map(_.size).max()
    let pathDescription = colors.underline(path)
    let verbDescription = _.padStart(verb || 'get', verbSize).slice(-maxVerbLength)
    // let templateDescription = _middelwareTemplate && space + colors.green(`(${_middelwareTemplate})`)
    // let middlewareDescription = colors.cyan(`(${_middlewareType})`)
    let middlewareDescription = colors.cyan(`${operationId}`)
    let policyDescription = colors.yellow(policyNames.length ? `[${policyNames.join(', ')}]` : '')
    //
    // return [indent, verbDescription, pathDescription, space, middlewareDescription, templateDescription, space, policyDescription].join(' ')
    this.momentum.log([indent, verbDescription, pathDescription, space, middlewareDescription, space, policyDescription].join(' '))
  }

  async stop() {
  }

}

module.exports = Api
