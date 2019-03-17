/*eslint-env node, mocha */
const _ = require('lodash')
const path = require('path')
const chai = require('chai')

// let assert = chai.assert
let expect = chai.expect

let utils = require('../../lib/momentum/utils')
let requireDir = utils.requireDir
var dirname = path.join( __dirname, '../fixtures/requireDir')

describe('requireDir', function () {

  it('should load', function () {

    expect(utils.requireDir).to.be.a('function')
    expect(requireDir).to.be.a('function')
  })

  it('imports a basic directory structure', function () {

    var results = requireDir({
      dirname: dirname,
      filter: /(.+)\.(js|coffee|litcoffee)$/,
      import: '*',
      flattenDirectories: false
    })

    let limit = 42
    expect(results.AwesomeModel).to.be.a('function')
    expect(results.AwesomeModel.options.limit).to.equal(limit)
    expect(results.AwesomeModel.onBeforeFind).to.be.a('function')
    expect(new results.AwesomeModel().getName).to.be.a('function')
    expect(new results.AwesomeModel().getName()).to.equal('AwesomeModel')

    expect(results.SomeController.options.view).to.equal('someController.pug')
    expect(new results.SomeController().sayHi).to.be.a('function')

    expect(results.simple.name).to.equal('simple')

    expect(results.subDir.CarrackCruiser.name).to.equal('Carrack Cruiser')

    expect(results.subDir.subSubDir.MillenniumFalcon.name).to.equal('Millennium Falcon')

  })

  it('can aggregate the results at the directory level', function () {

    var results = requireDir({
      dirname: dirname,
      filter: /(.+)\.(js|coffee|litcoffee)$/,
      import: '*',
      flattenDirectories: false,
      aggregate: true
    })

    let limit = 42
    expect(results.options.limit).to.equal(limit)

    expect(results).to.be.a('object')

    expect(results.options.view).to.equal('someController.pug')

    expect(results.name).to.equal('simple')

    expect(results.subDir.name).to.equal('Carrack Cruiser')

    expect(results.subDir.subSubDir.name).to.equal('Millennium Falcon')

  })

  it('can return file paths instead of loading', function () {

    var results = requireDir({
      dirname: dirname,
      filter: /(.+)\.(js|coffee|litcoffee)$/,
      import: '*',
      dontLoad: true,
      flattenDirectories: false
    })

    expect(results.AwesomeModel).to.equal(path.join(dirname, '/AwesomeModel.js'))
    expect(results.SomeController).to.equal(path.join(dirname, '/SomeController.js'))
    expect(results.simple).to.equal(path.join(dirname, '/simple.js'))
    expect(results.subDir.CarrackCruiser).to.equal(path.join(dirname, 'subDir/CarrackCruiser.js'))
    expect(results.subDir.subSubDir.MillenniumFalcon).to.equal(path.join(dirname, 'subDir/subSubDir/MillenniumFalcon.js'))

  })

  it('exclude sub directories', function () {

    var results = requireDir({
      dirname: dirname,
      filter: /(.+)\.(js|coffee|litcoffee)$/,
      excludeDirs: /subSubDir/,
      import: '*',
      flattenDirectories: false
    })

    let limit = 42
    expect(results.AwesomeModel).to.be.a('function')
    expect(results.AwesomeModel.options.limit).to.equal(limit)
    expect(results.AwesomeModel.onBeforeFind).to.be.a('function')
    expect(new results.AwesomeModel().getName).to.be.a('function')
    expect(new results.AwesomeModel().getName()).to.equal('AwesomeModel')

    expect(results.SomeController).to.be.a('function')
    expect(results.SomeController.options.view).to.equal('someController.pug')
    expect(new results.SomeController().sayHi).to.be.a('function')

    expect(results.simple.name).to.equal('simple')

    expect(results.subDir.CarrackCruiser.name).to.equal('Carrack Cruiser')

    expect(results.subDir.subSubDir).to.equal(undefined)

  })



  it('exclude exclude file patterns', function () {

    var results = requireDir({
      dirname: dirname,
      filter: /(.+)\.(js|coffee|litcoffee)$/,
      exclude: /(.+)Controller\.(js|coffee|litcoffee)$/,
      import: '*',
      flattenDirectories: false
    })

    let limit = 42

    expect(results.AwesomeModel).to.be.a('function')
    expect(results.AwesomeModel.options.limit).to.equal(limit)
    expect(results.AwesomeModel.onBeforeFind).to.be.a('function')
    expect(new results.AwesomeModel().getName).to.be.a('function')
    expect(new results.AwesomeModel().getName()).to.equal('AwesomeModel')

    expect(results.SomeController).to.equal(undefined)

    expect(results.simple.name).to.equal('simple')

    expect(results.subDir.CarrackCruiser.name).to.equal('Carrack Cruiser')

    expect(results.subDir.subSubDir.MillenniumFalcon.name).to.equal('Millennium Falcon')

  })


  it('can limit the imports', function () {

      var results = requireDir({
          dirname: dirname,
          filter: /(.+)\.(js|coffee|litcoffee)$/,
          import: 'options',
          flattenDirectories: false
      })

      let limit = 42
      expect(results.AwesomeModel.options.limit).to.equal(limit)
      expect(_.keys(results.AwesomeModel).length).to.equal(1)

      expect(results.SomeController.options.view).to.equal('someController.pug')
      expect(_.keys(results.SomeController).length).to.equal(1)

      expect(_.has(results, 'simple')).to.equal(true)
      expect(results.simple).to.equal(undefined)

      expect(_.has(results, 'subDir.CarrackCruiser')).to.equal(true)
      expect(results.subDir.CarrackCruiser).to.equal(undefined)

      expect(_.has(results, 'subDir.subSubDir.MillenniumFalcon')).to.equal(true)
      expect(results.subDir.subSubDir.MillenniumFalcon).to.equal(undefined)

  })


  it('can flatten the directory structure', function () {

      var results = requireDir({
          dirname: dirname,
          filter: /(.+)\.(js|coffee|litcoffee)$/,
          import: '*',
          flattenDirectories: true
      })

      let limit = 42

      expect(results.AwesomeModel).to.be.a('function')
      expect(results.AwesomeModel.options.limit).to.equal(limit)
      expect(results.AwesomeModel.onBeforeFind).to.be.a('function')
      expect(new results.AwesomeModel().getName).to.be.a('function')
      expect(new results.AwesomeModel().getName()).to.equal('AwesomeModel')

      expect(results.SomeController.options.view).to.equal('someController.pug')
      expect(new results.SomeController().sayHi).to.be.a('function')

      expect(results.simple.name).to.equal('simple')

      expect(results.CarrackCruiser.name).to.equal('Carrack Cruiser')

      expect(results.MillenniumFalcon.name).to.equal('Millennium Falcon')

  })


  it('can filter files', function () {

      var results = requireDir({
          dirname: dirname,
          filter: /(.+)Model\.(js|coffee|litcoffee)$/,
          import: '*',
          flattenDirectories: true
      })

      let limit = 42

      expect(results.Awesome).to.be.a('function')
      expect(results.Awesome.options.limit).to.equal(limit)
      expect(results.Awesome.onBeforeFind).to.be.a('function')
      expect(new results.Awesome().getName).to.be.a('function')
      expect(new results.Awesome().getName()).to.equal('AwesomeModel')

      expect(_.keys(results).length).to.equal(1)

  })


})
