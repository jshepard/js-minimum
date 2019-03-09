const _ = require('lodash')
const { EventEmitter } = require('events')

function listenerPromise(scope, path) {
  let method = _.get(scope, path)
  return function (...args) {
    return new Promise((resolve) => {
      args.push((...eventArgs) => {
        resolve(eventArgs)
      })
      return method.apply(scope, args)
    })
  }
}

function emitMethod(context, eventName, ...args) {
  if (_.isEmpty(eventName)) {
    return
  }

  let methodName = _.camelCase(['on'].concat(eventName.split(':')).join(':'))

  if (_.isFunction(context[methodName])) {
    context[methodName](...args)
  }
}

async function emitAsyncMethod(context, eventName, ...args) {
  if (_.isEmpty(eventName)) {
    return
  }

  let methodName = _.camelCase(['on'].concat(eventName.split(':')).join(':'))

  if (_.isFunction(context[methodName])) {
    await context[methodName](...args)
  }
}

function getSourceEventName(eventName, identity) {
  let eventNameParts = eventName.split(':')

  if (_.isEmpty(eventNameParts)) {
    eventNameParts = [eventName]
  }

  let first = _.first(eventNameParts)

  if (first === 'before' || first === 'after') {
    let before = eventNameParts.shift()
    eventNameParts.unshift(identity)
    eventNameParts.unshift(before)
  } else {
    eventNameParts.unshift(identity)
  }

  return eventNameParts.join(':')
}

function emitterProxy(target, proxies = [], identity) {

  if (target.hasOwnProperty('emitAsync') && _.isFunction(target.emitAsync)) {
    return
  }

  let emitter = new EventEmitter()

  if (!_.isArray(proxies)) {
    proxies = [proxies]
  }

  function createWrapper(name) {
    return function wrapper(eventName, ...args) {
      emitMethod(target, eventName, ...args)
      emitter[name](eventName, ...args)

      let sourceEventName = getSourceEventName(eventName, identity)
      _.each(proxies, (proxy) => {
        emitMethod(proxy, sourceEventName, ...args)
        if (_.isFunction(proxy[name])) {
          proxy[name](sourceEventName, ...args)
        }
      })
    }
  }

  function createAsyncWrapper(name) {
    return async function wrapper(eventName, ...args) {
      let promises = []
      promises.push(emitAsyncMethod(target, eventName, ...args))
      emitter[name](eventName, ...args)

      let sourceEventName = getSourceEventName(eventName, identity)
      _.each(proxies, (proxy) => {
        promises.push(emitAsyncMethod(proxy, sourceEventName, ...args))
        if (_.isFunction(proxy[name])) {
          proxy[name](sourceEventName, ...args)
        }
      })
      await Promise.all(promises)
    }
  }

  _.each(EventEmitter.prototype, (fn, name) => {
    if (name === 'emit') {
      fn = createWrapper(name)
    }
    if (_.isFunction(fn)) {
      Object.defineProperty(target, name, {value: _.bind(fn, emitter), enumerable: true})
    }
  })

  Object.defineProperty(target, 'emitAsync', {value: createAsyncWrapper('emit'), enumerable: true})

  Object.defineProperty(target, 'onceAsync', {value: listenerPromise(target, 'once'), enumerable: true})

}

module.exports = emitterProxy
