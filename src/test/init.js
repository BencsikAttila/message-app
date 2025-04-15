const assert = require('assert')

/** @type {ReturnType<import('../index')>} */
let app = null

before(() => {  
    /**
     * @param {() => Promise} promise
     */
    assert['rejects'] = function(promise) {
      return new Promise((resolve, reject) => {
        promise()
          .then(() => reject(new this.AssertionError({ message: 'Promise didn\'t rejected' })))
          .catch(() => resolve())
      })
    }
    
    app = require('../index')()
})

after(() => {
  app.server.close()
})
