const WebSocket = require('ws');
const sha256 = require('sha256');
const axios = require('axios');

const params = {
  channel: 'MiniBlockchainChannel',
  nickname: 'saltygeorge',
  uuid: 'a unique identifier (e.g 4547876e-c158-be87-9aa1-e6a9b5d9c063)',
  game: 'testnet'
};

const API = `https://gameathon.mifiel.com/api/v1/games/${params.game}`;

const ws = new WebSocket('wss://gameathon.mifiel.com/cable');

let lastBlock;

ws.on('open', () => {
  const data = {
    command: 'subscribe',
    identifier: JSON.stringify(params)
  }
  axios
    .get(`${API}/blocks`)
    .then((response) => {
      lastBlock = response;
    })
  ws.send(JSON.stringify(data));
});
ws.on('message', (event) => {
  console.log(event)
});