'use strict'

const _ = require('lodash')

const DEFAULT_CLIENT = 'postgres'
const DEFAULT_DATABASE = 'postgres'
const MIGRATION_FILE_EXT = 'js'
const SEED_FILE_EXT = 'js'

function getConfig(config) {
  // var ssl = config.database.ssl

  return {
    client: DEFAULT_CLIENT,
    connection: config.database.connection,
    migrations: {
      tableName: config.migrations.tableName,
      directory: config.paths.migrations
    },
    seeds: {
      directory: config.paths.seeds
    }
  }
}

function getKnex(config, options) {
  options = options || {}
  var SchemaBuilder = require('knex/lib/schema/builder.js')
  if (!SchemaBuilder.prototype.createTrackedTable) {
    var helpers = require('./knexSchemaHelpers.js')
    _.each(helpers, function (fn, key) {
      SchemaBuilder.prototype[key] = fn
    })
  }
  var knex = require('knex')
  var knexConfig = getConfig(config)

  return knex(_.extend({}, knexConfig, options))
}

// tap function to close the connection pool
function destroyKnex(knex) {
  return function() {
    knex.destroy()
  }
}

function createDatabase(config) {
  var parse = require('pg-connection-string').parse

  var connection = config.database.connection
  var dbConfig = parse(connection)
  var database = dbConfig.database

  // connect to the default database to create the target database
  dbConfig.database = DEFAULT_DATABASE

  var knex = getKnex(config, {connection: dbConfig})
  return knex.raw('CREATE DATABASE "' + database + '";')
    .tap(destroyKnex(knex))
}

function dropDatabase(config) {
  var parse = require('pg-connection-string').parse
  var connection = config.database.connection
  var dbConfig = parse(connection)
  var database = dbConfig.database

  // connect to the default database to drop the target database
  dbConfig.database = DEFAULT_DATABASE
  var knex = getKnex(config, {connection: dbConfig})
  return knex.raw('DROP DATABASE "' + database + '";')
    .tap(destroyKnex(knex))
}

function createMigration(config, baseName) {
  var knex = getKnex(config)
  return knex.migrate.make(baseName, { extension: MIGRATION_FILE_EXT })
    .tap(destroyKnex(knex))
}

function migrateLatest(config) {
  var knex = getKnex(config)
  return knex.migrate.latest().tap(destroyKnex(knex))
}

function migrateRollback(config) {
  var knex = getKnex(config)
  return knex.migrate.rollback().tap(destroyKnex(knex))
}

function migrateStatus(config) {
  var tableName = config.migrations.tableName
  var knex = getKnex(config)

  return knex.schema.hasTable(tableName)
    .then(function(exists) {
      if(exists) {
        return knex.select('*').from(tableName).orderBy('id')
      } else {
        return []
      }
    })
    .then(function(completed) {
      return [knex.migrate._listAll(), completed]
    })
    .tap(destroyKnex(knex))
}

function createSeed(config, baseName) {
  var knex = getKnex(config)
  return knex.seed.make(baseName, { extension: SEED_FILE_EXT })
  .tap(destroyKnex(knex))
}

function seedRun(config) {
  var knex = getKnex(config)
  return knex.seed.run()
  .tap(destroyKnex(knex))
}

module.exports = {
  createDatabase,
  dropDatabase,
  createMigration,
  migrateLatest,
  migrateRollback,
  migrateStatus,
  createSeed,
  seedRun
}
