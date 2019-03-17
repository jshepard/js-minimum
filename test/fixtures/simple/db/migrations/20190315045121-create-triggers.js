'use strict'
/*eslint no-magic-numbers: "off"*/

exports.up = function(knex, Promise) {
  return knex.schema.createMomentumSupport()
}

exports.down = function(knex, Promise) {
  return knex.schema.dropMomentumSupport()
}
