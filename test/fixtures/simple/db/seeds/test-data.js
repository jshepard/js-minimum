'use strict'
/*eslint no-magic-numbers: "off"*/

exports.seed = function(knex, Promise) {
  return Promise.resolve()
  .then(function () {
    return Promise.each([
      'account',
      'account_state',
      'account_group',
    ], function (table) {
      // Deletes ALL existing entries
      return knex(table).del()
    })
  })
  .then(function () {
    return Promise.each([
        {name: 'inactive'},
        {name: 'active'},
        {name: 'unknown'},
      ], function (accountState) {
        return knex('account_state').insert(accountState)
      })
  })
  .then(function () {
    return Promise.each([
        {},
        {},
        {},
        {},
        {id: 100}
      ], function (accountGroup) {
        return knex('account_group').insert(accountGroup)
      })
  })
  .then(function () {
    return Promise.each([
      {account_state_id: 2, account_group_id: 1, email: 'tony@stark.com', first_name: 'Tony', last_name: 'Stark', encrypted_password: '*****'},
      {account_state_id: 2, account_group_id: 1, email: 'steve.rogers@army.mil', first_name: 'Steve', last_name: 'Rogers', encrypted_password: '*****'},
      {account_state_id: 2, account_group_id: 1, email: 'widow@shield.gov', first_name: 'Natasha', last_name: 'Romanova', encrypted_password: '*****'},
      {account_state_id: 2, account_group_id: 2, email: 'danvers@starjammers.com', first_name: 'Carol', last_name: 'Danvers', encrypted_password: '*****'},
      {account_state_id: 2, account_group_id: 3, email: 'parker@dailybugle.com', first_name: 'Peter', last_name: 'Parker', encrypted_password: '*****'},
      {account_state_id: 2, account_group_id: 4, email: 'o.munroe@xsgy.edu', first_name: 'Ororo', last_name: 'Munroe', encrypted_password: '*****'}
    ], function (item) {
      return knex('account').insert(item)
    })
  })
  .then(function () {
    return Promise.each([
      {account_id: 2, code: '4F', location: 'New Haven', description: 'Found not acceptable for induction into active military service.'},
      {account_id: 2, code: '4F', location: 'Paramus', description: 'Found not acceptable for induction into active military service.'},
      {account_id: 2, code: '4F', location: 'Englewood', description: 'Found not acceptable for induction into active military service.'},
      {account_id: 2, code: '4F', location: 'Red Bank', description: 'Found not acceptable for induction into active military service.'},
      {account_id: 2, code: '4F', location: 'Bridgeton', description: 'Found not acceptable for induction into active military service.'},
      {account_id: 2, code: 'IA', location: 'Brooklyn', description: 'Accepted into Operation Rebirth - General Chester Phillips'}
    ], function (accountEvent) {
      return knex('account_event').insert(accountEvent)
    })
  })
  .then(function () {
    return Promise.each([
      {name: 'MODIFY_PROFILE', description: 'Modify Master Account Profile'},
      {name: 'MANAGE_CONTACTS', description: 'View and Manage Contacts'},
      {name: 'MODIFY_PASSWORDS', description: 'View and Modify Passwords'},
      {name: 'PAY_INVOICES', description: 'View and Pay Invoices'},
      {name: 'EDIT_TICKETS', description: 'View and Edit Support Tickets'}
    ], function (accountPermission) {
      return knex('account_permission').insert(accountPermission)
    })
  })
  .then(function () {
    return Promise.each([
      {account_id: 2, account_permission_id: 1},
      {account_id: 2, account_permission_id: 2},
      {account_id: 2, account_permission_id: 3}
    ], function (accountPermissionAssociation) {
      return knex('account_x_account_permission').insert(accountPermissionAssociation)
    })
  })
  .then(function () {
    return Promise.each([
      {name: 'US Army', description: ''},
      {name: 'Stark Industries', description: ''},
      {name: 'Star Jammers', description: ''},
      {name: 'Avengers', description: ''},
      {name: 'Daily Bugle', description: ''},
      {name: 'SHIELD', description: ''}
    ], function (agency) {
      return knex('agency').insert(agency)
    })
  })
  .then(function () {
    return Promise.each([
      {account_id: 2, agency_id: 1},
      {account_id: 2, agency_id: 4}
    ], function (agencyAssociation) {
      return knex('account_x_agency').insert(agencyAssociation)
    })
  })
}
