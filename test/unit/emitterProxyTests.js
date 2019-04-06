/*eslint-env node, mocha */
/*eslint no-magic-numbers: 0 */
const _ = require('lodash')
const path = require('path')
const chai = require('chai')

// let assert = chai.assert
let expect = chai.expect

// let log = console.log.bind(console)
describe('Emitter Proxy', function () {
  let momentum
  let emitterProxy
  let fixturesPath = path.join(__dirname, '../fixtures/simple')
  let stack = []

  // > z
  // time passes
  async function z(timeout) {
    return new Promise((resolve) => setTimeout(resolve, timeout))
  }

  before(function () {
    stack.push(process.cwd())
    process.chdir(fixturesPath)
    let Momentum = require('../../momentum')
    momentum = new Momentum({
      environment: 'test',
      processType: 'config',
      log: {log: _.noop }
    })

    emitterProxy = _.get(momentum, 'utils.emitterProxy')
  })

  after(function () {
    process.chdir(stack.pop())
  })

  it('should load', function () {

    expect(momentum.utils).to.be.a('object')
    expect(momentum.utils.emitterProxy).to.be.a('function')
  })

  describe('emit', function () {

    it('onEventName functions are called when events are emitted', function () {

      var sourceDidFire = false
      var source = {
        onSomeEvent: function(p1, p2) {
          sourceDidFire = true
          expect(p1).to.equal('one')
          expect(p2).to.equal('two')
        }
      }

      emitterProxy(source)
      source.emit('some:event', 'one', 'two')
      expect(sourceDidFire).to.equal(true)
    })

    it('events are proxied with source names', function () {

        var proxyDidFire = false
        var sourceDidFire = false
        var proxy = {
          onSourceSomeEvent: function (p1, p2) {
            proxyDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
          }
        }

        var source = {
          onSomeEvent: function(p1, p2) {
            sourceDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
          }
        }

        emitterProxy(source, proxy, 'source')
        source.emit('some:event', 'one', 'two')

        expect(proxyDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
    })

    it('listener events are fired', function () {

        var proxyDidFire = false
        var sourceDidFire = false

        var proxy = {}
        emitterProxy(proxy)

        proxy.on('source:some:event', function (p1, p2) {
            proxyDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        var source = {}
        emitterProxy(source, proxy, 'source')

        source.on('some:event', function(p1, p2) {
            sourceDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        source.emit('some:event', 'one', 'two')

        expect(proxyDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
    })

    it('before and after is move to the front of the event name', function () {

        var beforeProxyDidFire = false
        var proxyDidFire = false
        var afterProxyDidFire = false

        var beforeSourceDidFire = false
        var sourceDidFire = false
        var afterSourceDidFire = false

        var proxy = {}
        emitterProxy(proxy)

        proxy.on('before:source:some:event', function (p1, p2) {
            beforeProxyDidFire = true
            expect(p1).to.equal('-one')
            expect(p2).to.equal('-two')
        })

        proxy.on('source:some:event', function (p1, p2) {
            proxyDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        proxy.on('after:source:some:event', function (p1, p2) {
            afterProxyDidFire = true
            expect(p1).to.equal('+one')
            expect(p2).to.equal('+two')
        })


        var source = {}
        emitterProxy(source, proxy, 'source')

        source.on('before:some:event', function(p1, p2) {
            beforeSourceDidFire = true
            expect(p1).to.equal('-one')
            expect(p2).to.equal('-two')
        })

        source.on('some:event', function(p1, p2) {
            sourceDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        source.on('after:some:event', function(p1, p2) {
            afterSourceDidFire = true
            expect(p1).to.equal('+one')
            expect(p2).to.equal('+two')
        })

        source.emit('before:some:event', '-one', '-two')
        source.emit('some:event', 'one', 'two')
        source.emit('after:some:event', '+one', '+two')

        expect(beforeProxyDidFire).to.equal(true)
        expect(proxyDidFire).to.equal(true)
        expect(afterProxyDidFire).to.equal(true)

        expect(beforeSourceDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
        expect(afterSourceDidFire).to.equal(true)
    })

    it('before and after is move to the front of the event function name', function () {

        var beforeProxyDidFire = false
        var proxyDidFire = false
        var afterProxyDidFire = false

        var beforeSourceDidFire = false
        var sourceDidFire = false
        var afterSourceDidFire = false

        var proxy = {
            onBeforeSourceSomeEvent: function (p1, p2) {
                beforeProxyDidFire = true
                expect(p1).to.equal('-one')
                expect(p2).to.equal('-two')
            },

            onSourceSomeEvent: function (p1, p2) {
                proxyDidFire = true
                expect(p1).to.equal('one')
                expect(p2).to.equal('two')
            },

            onAfterSourceSomeEvent: function (p1, p2) {
                afterProxyDidFire = true
                expect(p1).to.equal('+one')
                expect(p2).to.equal('+two')
            }
        }

        var source = {
            onBeforeSomeEvent: function(p1, p2) {
                beforeSourceDidFire = true
                expect(p1).to.equal('-one')
                expect(p2).to.equal('-two')
            },
            onSomeEvent: function(p1, p2) {
                sourceDidFire = true
                expect(p1).to.equal('one')
                expect(p2).to.equal('two')
            },
            onAfterSomeEvent: function(p1, p2) {
                afterSourceDidFire = true
                expect(p1).to.equal('+one')
                expect(p2).to.equal('+two')
            }
        }

        emitterProxy(source, proxy, 'source')
        source.emit('before:some:event', '-one', '-two')
        source.emit('some:event', 'one', 'two')
        source.emit('after:some:event', '+one', '+two')

        expect(beforeProxyDidFire).to.equal(true)
        expect(proxyDidFire).to.equal(true)
        expect(afterProxyDidFire).to.equal(true)

        expect(beforeSourceDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
        expect(afterSourceDidFire).to.equal(true)
    })

  })

  describe('emitAsync', function () {

    it('onEventName functions are called when events are emitted', async function () {

      var sourceDidFire = false
      var source = {
        onSomeEvent: function(p1, p2) {
          sourceDidFire = true
          expect(p1).to.equal('one')
          expect(p2).to.equal('two')
        }
      }

      emitterProxy(source)
      await source.emitAsync('some:event', 'one', 'two')
      expect(sourceDidFire).to.equal(true)
    })

    it('onEventName functions can be async when events are emitted async', async function () {

      var sourceDidFire = false
      var source = {
        onSomeEvent: async function(p1, p2) {
          await z(10)
          sourceDidFire = true
          expect(p1).to.equal('one')
          expect(p2).to.equal('two')
        }
      }

      emitterProxy(source)
      let promise = source.emitAsync('some:event', 'one', 'two')
      expect(sourceDidFire).to.equal(false)
      await promise
      expect(sourceDidFire).to.equal(true)
    })

    it('events are proxied with source names', async function () {

        var proxyDidFire = false
        var sourceDidFire = false
        var proxy = {
          onSourceSomeEvent: function (p1, p2) {
            proxyDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
          }
        }

        var source = {
          onSomeEvent: function(p1, p2) {
            sourceDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
          }
        }

        emitterProxy(source, proxy, 'source')
        await source.emitAsync('some:event', 'one', 'two')

        expect(proxyDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
    })

    it('proxied event functions can be async when events are emitted async', async function () {

        var proxyDidFire = false
        var sourceDidFire = false
        var proxy = {
          onSourceSomeEvent: async function (p1, p2) {
            await z(10)

            proxyDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
          }
        }

        var source = {
          onSomeEvent: function(p1, p2) {
            sourceDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
          }
        }

        emitterProxy(source, proxy, 'source')
        let promise = source.emitAsync('some:event', 'one', 'two')

        // pre-promise, the async one has not completed but the sync one has
        expect(proxyDidFire).to.equal(false)
        expect(sourceDidFire).to.equal(true)

        await promise

        // post promise, both are complete
        expect(proxyDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
    })

    it('listener events are fired', async function () {

        var proxyDidFire = false
        var sourceDidFire = false

        var proxy = {}
        emitterProxy(proxy)

        proxy.on('source:some:event', function (p1, p2) {
            proxyDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        var source = {}
        emitterProxy(source, proxy, 'source')

        source.on('some:event', function(p1, p2) {
            sourceDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        await source.emitAsync('some:event', 'one', 'two')

        expect(proxyDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
    })


    it('listener events can be async, but do not wait', async function () {

        var proxyDidFire = false
        var sourceDidFire = false

        var proxy = {}
        emitterProxy(proxy)

        proxy.on('source:some:event', async function (p1, p2) {
            await z(10)

            proxyDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        var source = {}
        emitterProxy(source, proxy, 'source')

        source.on('some:event', async function(p1, p2) {
            await z(10)

            sourceDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        await source.emitAsync('some:event', 'one', 'two')

        expect(proxyDidFire).to.equal(false)
        expect(sourceDidFire).to.equal(false)

        await z(15)

        expect(proxyDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
    })

    it('before and after is move to the front of the event name', async function () {

        var beforeProxyDidFire = false
        var proxyDidFire = false
        var afterProxyDidFire = false

        var beforeSourceDidFire = false
        var sourceDidFire = false
        var afterSourceDidFire = false

        var proxy = {}
        emitterProxy(proxy)

        proxy.on('before:source:some:event', function (p1, p2) {
            beforeProxyDidFire = true
            expect(p1).to.equal('-one')
            expect(p2).to.equal('-two')
        })

        proxy.on('source:some:event', function (p1, p2) {
            proxyDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        proxy.on('after:source:some:event', function (p1, p2) {
            afterProxyDidFire = true
            expect(p1).to.equal('+one')
            expect(p2).to.equal('+two')
        })


        var source = {}
        emitterProxy(source, proxy, 'source')

        source.on('before:some:event', function(p1, p2) {
            beforeSourceDidFire = true
            expect(p1).to.equal('-one')
            expect(p2).to.equal('-two')
        })

        source.on('some:event', function(p1, p2) {
            sourceDidFire = true
            expect(p1).to.equal('one')
            expect(p2).to.equal('two')
        })

        source.on('after:some:event', function(p1, p2) {
            afterSourceDidFire = true
            expect(p1).to.equal('+one')
            expect(p2).to.equal('+two')
        })

        await source.emitAsync('before:some:event', '-one', '-two')
        await source.emitAsync('some:event', 'one', 'two')
        await source.emitAsync('after:some:event', '+one', '+two')

        expect(beforeProxyDidFire).to.equal(true)
        expect(proxyDidFire).to.equal(true)
        expect(afterProxyDidFire).to.equal(true)

        expect(beforeSourceDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
        expect(afterSourceDidFire).to.equal(true)
    })

    it('before and after is move to the front of the event function name', async function () {

        var beforeProxyDidFire = false
        var proxyDidFire = false
        var afterProxyDidFire = false

        var beforeSourceDidFire = false
        var sourceDidFire = false
        var afterSourceDidFire = false

        var proxy = {
            onBeforeSourceSomeEvent: function (p1, p2) {
                beforeProxyDidFire = true
                expect(p1).to.equal('-one')
                expect(p2).to.equal('-two')
            },

            onSourceSomeEvent: function (p1, p2) {
                proxyDidFire = true
                expect(p1).to.equal('one')
                expect(p2).to.equal('two')
            },

            onAfterSourceSomeEvent: function (p1, p2) {
                afterProxyDidFire = true
                expect(p1).to.equal('+one')
                expect(p2).to.equal('+two')
            }
        }

        var source = {
            onBeforeSomeEvent: function(p1, p2) {
                beforeSourceDidFire = true
                expect(p1).to.equal('-one')
                expect(p2).to.equal('-two')
            },
            onSomeEvent: function(p1, p2) {
                sourceDidFire = true
                expect(p1).to.equal('one')
                expect(p2).to.equal('two')
            },
            onAfterSomeEvent: function(p1, p2) {
                afterSourceDidFire = true
                expect(p1).to.equal('+one')
                expect(p2).to.equal('+two')
            }
        }

        emitterProxy(source, proxy, 'source')
        await source.emit('before:some:event', '-one', '-two')
        await source.emit('some:event', 'one', 'two')
        await source.emit('after:some:event', '+one', '+two')

        expect(beforeProxyDidFire).to.equal(true)
        expect(proxyDidFire).to.equal(true)
        expect(afterProxyDidFire).to.equal(true)

        expect(beforeSourceDidFire).to.equal(true)
        expect(sourceDidFire).to.equal(true)
        expect(afterSourceDidFire).to.equal(true)
    })

  })

  describe('onceAsync', function() {

    it('resolves after the event is emitted', async function () {

      var sourceDidFire = false
      var source = {}

      emitterProxy(source)

      setTimeout(function(){
        source.emit('some:event', 'one', 'two')
        sourceDidFire = true
      }, 10)

      await source.onceAsync('some:event')
      expect(sourceDidFire).to.equal(true)
    })

    it('resolves after the event is emitted with emitAsync', async function () {

      var sourceDidFire = false
      var source = {}

      emitterProxy(source)

      setTimeout(function () {
        source.emitAsync('some:event', 'one', 'two')
        sourceDidFire = true
      }, 10)

      await source.onceAsync('some:event')
      expect(sourceDidFire).to.equal(true)
    })

  })
})
