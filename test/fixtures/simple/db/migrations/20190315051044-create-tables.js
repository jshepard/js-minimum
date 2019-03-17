'use strict'
/*eslint no-magic-numbers: "off"*/

exports.up = function(knex, Promise) {
  return Promise.resolve()
  .then(function () {
    return knex.schema.createTrackedTable('account_state', function (t) {
      t.string('name', 100).notNullable()
    })
  })
  .then(function () {
    return knex.schema.createTrackedTable('account_group')
  })
  .then(function () {
    return knex.schema.createTrackedTable('account_permission', function(t) {
      t.string('name', 100).notNullable().unique()
      t.string('description')
    })
  })
  .then(function () {
    return knex.schema.createTrackedTable('account', function(t) {
      t.integer('account_state_id').notNullable().references('account_state.id')
      t.integer('account_group_id').notNullable().references('account_group.id')
      t.string('email', 100).notNullable().unique().index()
      t.string('first_name', 100)
      t.string('last_name', 100)
      t.string('encrypted_password').notNullable()
      t.string('activation_token')
      t.string('reset_password_token')
      t.dateTime('reset_password_expires_at')
      t.string('update_email_token')
      t.string('update_email')
      t.boolean('active').defaultTo(false)
      t.boolean('suspended').defaultTo(false)
      t.integer('failed_login_attempts').defaultTo(0)
      t.string('failed_login_ip_address')
      t.dateTime('failed_login_suspended_until')
      t.dateTime('last_login_at')
      t.json('state')
    })
  })
  .then( function () {
    return knex.schema.createTrackedTable('account_event', function (t) {
      t.integer('account_id').notNullable().references('account.id')
      t.string('code', 15)
      t.string('location', 100)
      t.string('description', 256)
    })
  })
  .then(function () {
    return knex.schema.createTrackedTable('account_x_account_permission', function(t) {
      t.integer('account_id').notNullable().references('account.id').index()
      t.integer('account_permission_id').notNullable().references('account_permission.id')
      t.unique(['account_id', 'account_permission_id'])
    })
  })
  .then( function () {
    return knex.schema.createTrackedTable('agency', function (t) {
      t.string('name', 100).notNullable().unique()
      t.string('description')
    })
  })
  .then(function () {
    return knex.schema.createTrackedTable('account_x_agency', function(t) {
      t.integer('account_id').notNullable().references('account.id').index()
      t.integer('agency_id').notNullable().references('agency.id')
      t.unique(['account_id', 'agency_id'])
    })
  })

}

exports.down = function(knex, Promise) {

  return Promise.resolve()
  .then(function () {
    return knex.schema.dropTable('account_x_account_permission')
  })
  .then(function () {
    return knex.schema.dropTable('account_event')
  })
  .then(function () {
    return knex.schema.dropTable('account_x_agency')
  })
  .then(function () {
    return knex.schema.dropTable('agency')
  })
  .then(function () {
    return knex.schema.dropTable('account')
  })
  .then(function () {
    return knex.schema.dropTable('account_permission')
  })
  .then(function () {
    return knex.schema.dropTable('account_group')
  })
}
