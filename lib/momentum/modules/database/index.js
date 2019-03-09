const _ = require('lodash')
const pg = require('pg')
const gesundheit = require('gesundheit')
const {TableModel} = require('./tableModel')
const {createTableModels, loadAppTableModels} = require('./tableModelFactory')
const {addDbMethods, loadDbEnumerations} = require('./dbUtils')
const tableDescriptionQuery = require('./tableDescriptionQuery.sql')

class Database {
  constructor(momentum) {
    momentum.utils.emitterProxy(this, momentum, 'database')
    this.momentum = momentum
    this.TableModel = TableModel
    this.identity = 'db'
    this.globalNames = []
    this.tableDescriptions = {}
    this.models = {}
    this.enums = {}
  }

  async initialize() {
    let momentum = this.momentum

    momentum.log('Loading Database...')
    this.emit('before:initialize')

    let dbConfig = momentum.config.database

    _.extend(pg.defaults, dbConfig.defaults)

    let connectionPool = _.extend({
      onConnect: (connection, done) => {
        connection.query(`SET statement_timeout TO ${dbConfig.statementTimeout};`, () => {
          done(null, connection)
        })
      }
    }, dbConfig.connectionPool)

    this.db = gesundheit.engine(dbConfig.connection, connectionPool)

    addDbMethods(this, momentum, this.db)

    this.tableDescriptions = await this.getTableDescriptions()

    // create the default models and enumerations
    this.models = createTableModels(momentum, this)
    this.enums = await loadDbEnumerations(momentum, this)

    // expose the enumerations
    _.each(this.enums, (enums, globalEnumName) => {
      if (!global[globalEnumName]) {
        this.globalNames.push(globalEnumName)
        global[globalEnumName] = enums
      } else {
        momentum.log.warn(`Global enumeration conflict: ${globalEnumName} already exists. Skipping`)
      }
    })
    this.momentum.enums = this.enums

    // expose the base models
    _.each(this.models, (tableModel) => {
      if (!global[tableModel.globalId]) {
        this.globalNames.push(tableModel.globalId)
        global[tableModel.globalId] = tableModel
      } else if (!this.enums[tableModel.globalId]) {
        momentum.log.warn(`Global Model conflict: ${tableModel.globalId} already exists. Skipping`)
      }
    })
    this.momentum.models = this.models

    // load the app models (which will extend the base models)
    this.models = loadAppTableModels(momentum, this, this.models)

    // clobber the globals with the app models
    _.each(this.models, (tableModel) => {
        // make final tableModel an event emitter
        momentum.utils.emitterProxy(tableModel, [], tableModel.identity)

      if (_.includes(this.globalNames, tableModel.globalId) && !this.enums[tableModel.globalId]) {
        global[tableModel.globalId] = tableModel
      }
    })

    this.momentum.models = this.models
    this.momentum.enums = this.enums

    this.emit('initialize')
  }

  async start() {
    // we had to expose our globals early...
  }

  async stop() {
    // shut down the gesundheit pool
    this.db.close()

    // delete the globals
    _.each(this.globalNames, (globalName) => {
      delete global[globalName]
    })
  }

  async getAvailableSchemas() {
    let results = await this.query('SELECT schema_name FROM information_schema.schemata;')
    return _.map(results.rows, 'schema_name')
  }

  async getSearchPath() {
    let result = await this.query('SHOW search_path;')
    let path = _.chain(result.rows)
      .map('search_path')
      .first()
      .value()

    return _.map(path.split(','), _.trim)
  }

  async getSchema() {
    let schemas = await this.getAvailableSchemas()
    let searchPath = await this.getSearchPath()

    return _.find(searchPath, (schema) => {
        return _.includes(schemas, schema)
    })
  }

  async getTableDescriptions() {
    let momentum = this.momentum
    let schema = momentum.config.database.schema

    if (!schema) {
      schema = await this.getSchema()
    }

    let result = await this.query(tableDescriptionQuery, [schema])

    let rows = result.rows
    let tableDescriptions = {}
    let tables = _.groupBy(rows, 'table_name')

    _.each(tables, (columns, tableName) => {
      let tableDescription = _.chain(columns)
        .first()
        .pick('table_catalog', 'table_schema', 'table_type', 'table_name', 'is_insertable_into')
        .value()

      tableDescription.columnDescriptions = _.chain(columns)
        .keyBy('column_name')
        .value()

      tableDescriptions[tableName] = tableDescription
    })

    return tableDescriptions
  }

}

module.exports = Database
