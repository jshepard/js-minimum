function getSchema(client) {
  var SchemaBuilder = require('knex/lib/schema/builder.js')
  return new SchemaBuilder(client)
}

module.exports = {
  createTrackedTableSupport: function createTrackedTableSupport() {
    var track_on_insert = [
      'CREATE OR REPLACE FUNCTION track_on_insert()',
      '  RETURNS trigger AS',
      '$BODY$',
      'BEGIN',
      '    NEW.version = 1;',
      '    NEW.created_at = timezone(\'UTC\', now());',
      '    NEW.updated_at = NEW.created_at;',
      '    RETURN NEW;',
      'END;',
      '$BODY$',
      '  LANGUAGE plpgsql VOLATILE',
      '  COST 100;'
    ].join('\n')

    var track_on_update = [
      'CREATE OR REPLACE FUNCTION track_on_update()',
      '  RETURNS trigger AS',
      '$BODY$',
      'BEGIN',
      '    NEW.version = OLD.version + 1;',
      '    NEW.created_at = OLD.created_at;',
      '    NEW.updated_at = timezone(\'UTC\', now());',
      '    RETURN NEW;',
      'END;',
      '$BODY$',
      '  LANGUAGE plpgsql VOLATILE',
      '  COST 100;'
    ].join('\n')

    return this.raw([
      track_on_insert,
      track_on_update
    ].join('\n'))
  },

  dropTrackedTableSupport: function dropTrackedTableSupport() {
    return this.raw([
      'DROP FUNCTION track_on_insert();',
      'DROP FUNCTION track_on_update();'
    ].join('\n'))
  },

  createTrackedTable: function createTrackedTable(tableName, tableCallback) {

    var track_on_insert = [
      'CREATE TRIGGER ' + tableName + '_track_on_insert_trigger',
      'BEFORE INSERT',
      'ON "' + tableName + '"',
      'FOR EACH ROW',
      'EXECUTE PROCEDURE track_on_insert();'
    ].join('\n')

    var track_on_update = [
      'CREATE TRIGGER ' + tableName + '_track_on_update_trigger',
      'BEFORE UPDATE',
      'ON "' + tableName + '"',
      'FOR EACH ROW',
      'EXECUTE PROCEDURE track_on_update();'
    ].join('\n')

    var client = this.client
    return this.createTable(tableName, function(t) {
      t.increments('id')
      t.integer('version')
      t.timestamps()

      if (tableCallback) {
        tableCallback(t)
      }
    })
    .then(function () {
      return getSchema(client).raw([
        track_on_insert,
        track_on_update
      ].join('\n'))
    })
  },

  createWorkerSupport: function () {
    var client = this.client

    return Promise.resolve()
    .then(function () {
      return getSchema(client).createTrackedTable('worker', function (t) {
        t.string('type', 100).notNullable()
        t.string('dyno', 100).notNullable()
        t.dateTime('heartbeat_at')
      })
    })
    .then(function () {
      return getSchema(client).createTrackedTable('job_state', function (t) {
        t.string('name', 100).notNullable()
      })
      .then(function () {
        var Bluebird = require('bluebird')
        return Bluebird.each([
          {name: 'available'},
          {name: 'running'},
          {name: 'succeeded'},
          {name: 'failed'}
        ], function (state) {
          return client.queryBuilder().table('job_state').insert(state)
        })
      })
    })
    .then(function () {
      return getSchema(client).createTrackedTable('job', function (t) {
        t.string('worker_type', 100).notNullable()
        t.integer('job_state_id').notNullable().references('job_state.id')
        t.integer('priority').notNullable()
        t.dateTime('run_at').notNullable()
        t.integer('attempts')
        t.text('error')
        t.dateTime('started_at')
        t.dateTime('finished_at')
        t.json('data')
        t.integer('timeout').notNullable()
        t.integer('worker_id').references('worker.id')
      })
    })
  },

  dropWorkerSupport: function () {
    var client = this.client

    return Promise.resolve()
    .then(function () {
      return getSchema(client).dropTable('job')
    })
    .then(function () {
      return getSchema(client).dropTable('job_state')
    })
    .then(function () {
      return getSchema(client).dropTable('worker')
    })
  },

  createMomentumSupport: function () {
    var self = this

    return Promise.resolve()
    .then(function () {
      return self.createTrackedTableSupport()
    })
    .then(function () {
      return self.createWorkerSupport()
    })
  },

  dropMomentumSupport: function () {
    var self = this

    return Promise.resolve()
    .then(function () {
      return self.dropWorkerSupport()
    })
    .then(function () {
      return self.dropTrackedTableSupport()
    })
  }


}
