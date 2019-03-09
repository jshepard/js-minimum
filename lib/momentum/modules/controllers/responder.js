const _ = require('lodash')

class Responder {

  //===============
  // Helper Methods
  //===============

  getViewLocals(req, res, results) {
    let globals = _.keys(momentum.config.globals)

    let locals = {
      req: req,
      results: results
    }

    return _.extend(locals, _.pick(global, 'momentum', globals), res.locals)
  }

  jsonResponder(req, res) {
    return (results) => {
      res.jsonp(results)
    }
  }

  textResponder(req, res) {
    return (results) => {
      res.send(results)
    }
  }

  htmlResponder(req, res) {
    return (results) => {
      let view = req.options.view
      let existingViews = {} // _.values(momentum.router.viewFiles)

      if (view && _.includes(existingViews, view)) {
        let locals = this.getViewLocals(req, res, results)

        res.render(view, locals)
      } else {
        res.send(results)
      }
    }
  }

  getResponders(req, res) {
    return {
      'default': this.jsonResponder(req, res),
      json: this.jsonResponder(req, res),
      html: this.htmlResponder(req, res),
      text: this.textResponder(req, res)
    }
  }

  getResponder(req, res) {
    let responders = this.getResponders(req, res)
    let options = _.keys(responders)
    let override = req.query[momentum.config.routes.formatOverride]

    if (_.includes(options, override)) {
      return responders[override]
    }

    return responders[req.accepts(options)]
  }

  getRouteMiddleware() {
    return (req, res, next) => {
      res.locals = {}

      res.view = (results = {}) => {
        return this.sendResults(req, res)(results)
      }

      next()
    }
  }

  sendResults(req, res) {
    return (results) => {
      if (res.headersSent) {
        return
      }
      if (!_.isUndefined(results) && results !== null) {
        this.getResponder(req, res)(results)
      } else {
        this.send404(req, res)
      }
    }
  }

  send404(req, res) {
    try {
      if (_.isFunction(res.notFound)) {
        return res.notFound()
      }
    } catch (e) { /* press on */ }

    try {
      momentum.log.debug('A request did not match any routes, and no `res.notFound` handler is configured.')
      return res.sendStatus(404)
    } catch (e) {
      momentum.log.error('An unmatched route was encountered in a request...')
      momentum.log.error('But no response could be sent because an error occurred:')
      momentum.log.error(e)
      return
    }
  }

  send500(err, req, res) {
    try {
      if (_.isFunction(res.negotiate)) {
        return res.negotiate(err)
      }
    } catch (e) { /* press on */ }

    try {
      let stackTrace = _.result(err, 'stack', err)
      if (stackTrace && _.startsWith(stackTrace, 'error:')) {
        stackTrace = stackTrace.slice('error: '.length)
      }
      momentum.log.error(stackTrace)
      return res.sendStatus(500)
    } catch (errorSendingResponse) {
      momentum.log.error('But no response could be sent because another error occurred:')
      momentum.log.error(errorSendingResponse)
    }
  }

}

module.exports = {
  Responder
}
