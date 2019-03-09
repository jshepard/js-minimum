const _ = require('lodash')

function verb(verb, path) {
  return function (target, key, descriptor) {
    if (!key) {
      return
    }

    verb = verb === 'del' ? 'delete' : verb

    let action = {
      verb: verb,
      path: path || '',
      key: key,
    }

    let Type = target.constructor
    Type.options = _.extend({}, Type.options)
    Type.options.actions = Type.options.actions || []
    Type.options.actions.push(action)

    return descriptor;
  }
}

module.exports.options = function options(value) {
  return function decorator(target) {
    target.options = target.options || {}
    target.options = _.extend({}, target.options, value)
  }
}

module.exports.policies = function(policies) {
  return function decorator(target, key, description) {
    if (key) {
      let Type = target.constructor
      Type.options = _.extend({policies: {}}, Type.options)
      Type.options.policies[key] = policies
      return description
    } else {
      let Type = target
      Type.options = Type.options || {}
      Type.options = _.extend({policies: {}}, Type.options)
      Type.options.policies['*'] = policies
    }
  }
}

_.each(['get', 'put', 'post', 'del', 'patch'], function (v) {
  module.exports[v] = function (path) {
    return verb(v, path)
  }
})
