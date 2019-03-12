const _ = require('lodash')
const bluebird = require('bluebird')
const Numeral = require('numeral')
const {Responder} = require('./responder')

class Route extends Responder {

  constructor(identity, options = {}) {
    super()

    // make Route an event emitter
    momentum.utils.emitterProxy(this)

    this.options = _.defaultsDeep(options, momentum.config.routes)
    this.identity = identity

    let root = _.get(this.options, 'root')
    this.root = root === '/' ? '' : root
    let basePath = identity === 'index' ? `${this.root}` : `${this.root}/${this.identity}`

    this.basePath = _.get(this.options, 'basePath', basePath)
    this.globalId = _.trimStart(`${this.root}/${this.identity}Route`, '/').split('/').join('::')

    this.actions = this.createActions()
    this.policies = this.constructor.options.policies || {}
  }

  //===============
  // Helper Methods
  //===============

  getData(req) {
    if (req.body) {
      return req.body
    }
    return req.params
  }

  getViewLocals(req, res, results) {
    let locals = super.getViewLocals(req, res, results)

    return _.extend({
      route: this
    }, locals)
  }

  createActions() {
    return _.cloneDeep(this.constructor.options.actions)
  }

  createApiPath(path, action) {
    let parameters = action.parameters || this.paramsForPath(path)
    let operationId = this.getOperationId(action)
    let status = action.status || '200'
    let apiPath = {
      [action.verb]: {
        operationId: operationId,
        responses: {
          [status]: { description: 'ok' },
        },
      },
    }

    if (!_.isEmpty(parameters)) {
      apiPath.parameters = parameters
    }

    return apiPath
  }

  getApiPaths() {
    let actions = {}

    _.each(this.actions, (action) => {
      let path = `${this.basePath}${action.path}` || '/'
      actions[path] = _.extend(actions[path], this.createApiPath(path, action))
    })

    return actions
  }

  paramsForPath(path) {
    const paramRegex = /[^{\}]+(?=})/g
    const params = path.match(paramRegex)
    return _.map(params, (name) => {
      return {
        name: name,
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        }
      }
    })
  }

  createApiHandler(name, options = {}) {
    let handlers = this.handlerChain(name, options)

    return (c, req, res) => {
      _.extend(req.params, c.request.params)
      _.extend(req.query, c.request.query)

      let localHandlers = _.clone(handlers)
      let next = () => {
        let fn = localHandlers.shift()
        if (fn) {
          fn(req, res, next)
        }
      }
      next()
    }
  }

  handlerChain(name, options) {
    let setup = (req, res, next) => {
      req.options = _.cloneDeep(options)
      req.momentum = momentum
      next()
    }

    let policies = this.getPolicies(name).map((policy) => {
      return momentum.modules.controllers.policies[policy]
    })

    let action = (req, res) => {
      req._startTime = new Date()

      bluebird.resolve(this[name](req, res))
      .then(this.sendResults(req, res))
      .catch(error => {
        this.send500(error, req, res)
      })
      .finally(() => {
        let responseTime = new Date() - req._startTime
        let responseSize = Numeral(res.get('Content-Length') || 0).format('0b')
        let method = _.padStart(req.method, 'DELETE'.length)
        momentum.log.info(`${method} ${res.statusCode} ${req.url}  (${responseTime} ms) [${responseSize}]`)
      })
    }

    return [].concat(
      [setup],
      policies,
      [action]
    )
  }

  getPolicies(name) {
    return this.policies[name] || this.policies['*'] || []
  }

  getOperationId(action) {
    return `${this.globalId}#${action.key}`
  }

  getApiHandlers() {
    let handlers = {}
    _.each(this.actions, (action) => {
      let operationId = this.getOperationId(action)
      handlers[operationId] = this.createApiHandler(action.key, action.options)
    })

    return handlers
  }

  afterEvent(eventName, req, res, tx) {
    return async (results) => {
      await this.emitAsync(eventName, req, res, results, tx)
      return results
    }
  }

}

Route.options = {
  bind: true,
}

module.exports.Route = Route
