// This is Javascript we run before user code to make the context useful. The host application
// defined a bunch of global references we can use to call back into node to get stuff done.
// This creates private variables for each of these, then clears the globals.

// This is the pattern you use with isolated-vm to keep references to sensitive stuff private.
new function () {
  // Grab a reference to the ivm module and delete it from global scope. Now this closure is the
  // only place in the context with a reference to the module. The `ivm` module is very powerful
  // so you should not put it in the hands of untrusted code.
  let ivm = _ivm;
  delete _ivm;

  // Now we create the other half of the `log` function in this isolate. We'll just take every
  // argument, create an external copy of it and pass it along to the log function above.
  let log = _log;
  delete _log;
  global.console = {
    log: function (...args) {
      // We use `copyInto()` here so that on the other side we don't have to call `copy()`. It
      // doesn't make a difference who requests the copy, the result is the same.
      // `applyIgnored` calls `log` asynchronously but doesn't return a promise-- it ignores the
      // return value or thrown exception from `log`.
      log.applyIgnored(undefined, args.map(arg => new ivm.ExternalCopy(arg).copyInto()));
    }
  }
  // Other half of fetch function in this isolate
  let fetch = _fetch

  // This is just a dumb fetch that returns a basic response with the body as a 
  // string. And since we love promises, we turn it into a promise along the way so
  // we can use it like `await fetch("https://wat")`
  global.fetch = function (url) {
    _busy = true
    return new Promise((resolve, reject) => {
      const callback = new ivm.Reference(function (err, resp) {
        if (err) {
          reject(err)
        } else {
          resolve(JSON.parse(resp))
        }
      })
      fetch.apply(null, [url, callback])
    })
  }
}