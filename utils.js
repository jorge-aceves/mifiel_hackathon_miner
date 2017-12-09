const api = require('./api');

module.exports = {
  start: function() {
    return new Promise((resolve, reject) => {
      Promise
        .all([api.getBlocks, api.getPool, api.getTarget])
        .then(values => {
          resolve({
            blocks: values[0],
            pool: values[1],
            target: values[2]
          });
        })
        .catch(err => reject(err));
    });
  },
};
