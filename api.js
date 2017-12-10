const axios = require('axios');
const config = require('./config');

const API = `https://gameathon.mifiel.com/api/v1/games/${config.params.game}`;

module.exports = {
  getBlocks: function () {
    return new Promise((resolve, reject) => {
      axios
        .get(`${API}/blocks`)
        .then((reponse) => resolve(reponse.data))
        .catch((error) => reject(error.response.data));
    });
  },
  getPool: function () {
    return new Promise((resolve, reject) => {
      axios
        .get(`${API}/pool`)
        .then((response) => resolve(response.data))
        .catch((error) => reject(error.response.data));
    });
  },
  getTarget: function () {
    return new Promise((resolve, reject) => {
      axios
        .get(`${API}/target`)
        .then((response) => resolve(response.data.target))
        .catch((error) => reject(error.response.data));
    });
  },
  blockFound: function (minedBlock) {
    return new Promise((resolve, reject) => {
      axios.post(`${API}/block_found`, minedBlock)
        .then(response => resolve(response.data))
        .catch(error => reject(error.response.data))
    });
  }
}
