/**
 * GOOGLE APPS SCRIPT CLIENT BRIDGE FOR LOCALHOST
 * Transparently polyfills google.script.run so that Index.html runs identically
 * on localhost without requiring Google Apps Script environment.
 */
(function() {
  if (typeof window.google === 'undefined') {
    window.google = {};
  }
  if (!window.google.script) {
    window.google.script = {};
  }

  function createGasRunner(successCb, failureCb) {
    return new Proxy({}, {
      get: function(target, functionName) {
        if (functionName === 'withSuccessHandler') {
          return function(handler) {
            return createGasRunner(handler, failureCb);
          };
        }
        if (functionName === 'withFailureHandler') {
          return function(handler) {
            return createGasRunner(successCb, handler);
          };
        }

        return function() {
          var args = Array.prototype.slice.call(arguments);
          fetch('/api/gas-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              functionName: functionName,
              args: args
            })
          })
          .then(function(response) {
            return response.json();
          })
          .then(function(data) {
            if (data && data.error === undefined) {
              if (typeof successCb === 'function') {
                try {
                  successCb(data.result !== undefined ? data.result : data);
                } catch (clientErr) {
                  console.error('Error in client success handler for [' + functionName + ']:', clientErr);
                }
              }
            } else {
              var errMsg = (data && data.message) ? data.message : 'Server error';
              if (typeof failureCb === 'function') {
                failureCb(new Error(errMsg));
              } else {
                console.error('GAS Error [' + functionName + ']:', errMsg);
              }
            }
          })
          .catch(function(err) {
            console.error('GAS Network Error [' + functionName + ']:', err);
            if (typeof failureCb === 'function') {
              failureCb(err);
            }
          });
        };
      }
    });
  }

  window.google.script.run = createGasRunner();
  console.log('✅ Google Apps Script Localhost Bridge aktif di localhost.');
})();
