const assert = require('assert')

/** @type {ReturnType<import('../index')>} */
let app = null

before(() => {
  // /**
  //  * @param {(() => Promise) | Promise} promise
  //  */
  // assert['rejects'] = function (promise) {
  //   return new Promise((resolve, reject) => {
  //     (typeof promise === 'function' ? promise() : promise)
  //       .then(() => reject(new this.AssertionError({ message: 'Promise didn\'t rejected' })))
  //       .catch(() => resolve())
  //   })
  // }

  app = require('../index')({
    inMemoryDatabase: true
  })
})

after(() => {
  app.server.close()
})
