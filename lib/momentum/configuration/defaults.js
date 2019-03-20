const path = require('path')

module.exports = () => {
  const DEFAULT_ENV = 'development'
  const DEFAULT_PORT = 3000
  const environment = process.env.NODE_ENV || DEFAULT_ENV
  const port = process.env.PORT || DEFAULT_PORT
  const appPath = process.cwd()
  const server = 'server'
  const tmpPath = path.resolve(appPath, '.tmp')

  return {
    environment: environment,

    startUpMaxWaitMilliseconds: 5000, 

    processType: 'all',

    processModules: {
      config: [],
      all:    ['globals', 'database', 'services', 'controllers', 'api', 'server'],
      api:    ['globals', 'database', 'services', 'controllers', 'api'],
      repl:   ['globals', 'database', 'services']
    },

    globals: {
    },

    database:{
      statementTimeout: 10000,
      connection: process.env.DATABASE_URL,
      enumerationTables: [],
      enumerationTableSuffixes: ['_type', '_status', '_state'],
      pluralizedTableNames: false,
      defaults: {
        parseInt8: true
      },
      connectionPool: {
        min: 2,
        max: 5,
        log: false
      }
    },

    migrations: {
      tableName: 'migration'
    },

    models: {
      limit: 100
    },

    batchRequest: {
      root: '/api'
    },

    routes: {
    },

    controllers: {
      limit: 100
    },

    paths: {
      appPath:     appPath,
      tmp:         tmpPath,
      public:      tmpPath,
      assets:      path.resolve(appPath, 'assets'),
      views:       path.resolve(appPath, server, 'views'),
      models:      path.resolve(appPath, server, 'models'),
      policies:    path.resolve(appPath, server, 'policies'),
      responses:   path.resolve(appPath, server, 'responses'),
      controllers: path.resolve(appPath, server, 'routes'),
      routes:      path.resolve(appPath, server, 'routes'),
      services:    path.resolve(appPath, server, 'services'),
      workers:     path.resolve(appPath, server, 'workers'),
      migrations:  path.resolve(appPath, 'db', 'migrations'),
      seeds:       path.resolve(appPath, 'db', 'seeds')
    },

    api: {
      definition: {
        openapi: '3.0.1',
        info: {
          title: 'Open API',
          version: '1.0.0',
        },
      },
      formatOverride: '_format',
      jsonp: '_cb',
      order: [
        'json',
        'router'
      ],
    },

    viewEngines: {},

    middleware: {
      json: () => { return require('express').json() },
    },

    server:{
      port: port,
    }
  }
}
