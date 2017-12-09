const axios = require('axios');
const config = require('./config');

const API = `https://gameathon.mifiel.com/api/v1/games/${config.params.game}`;

module.exports = {
  getBlocks: new Promise((resolve, reject) => {
    axios
    .get(`${API}/blocks`)
    .then((reponse) => resolve(reponse.data))
    .catch((error) => reject(error));
  }),
  getPool: new Promise((resolve, reject) => {
    axios
    .get(`${API}/pool`)
    .then((response) => resolve(response.data))
    .catch((error) => reject(error));
  }),
  getTarget: new Promise((resolve, reject) => {
    axios
    .get(`${API}/target`)
    .then((response) => resolve(response.data.target))
    .catch((error) => reject(error));
  }),
  blockFound: function(minedBlock) {
    return new Promise((resolve, reject) => {
      axios.post(`${API}/block_found`, minedBlock)
      .then(response =>resolve(response.data))
      .catch(error => reject(error))
    });
  }
}
