
const retry = require('promise-retry')

function promiseRetry (fn) {
  const retryOptions = {
    retries: 3,
    factor: 2,
    minTimeout: 1 * 1000,
    randomize: true
  }
  return retry(fn, retryOptions)
}

module.exports = {
  promiseRetry
}