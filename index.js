const WebSocket = require('ws');
const sha256 = require('sha256');
const axios = require('axios');

const params = {
  channel: 'MiniBlockchainChannel',
  nickname: 'saltygeorge',
  uuid: 'a unique identifier (e.g 4547876e-c158-be87-9aa1-e6a9b5d9c063)',
  game: 'testnet',
  version: 1,
  message: 'Puto el que lo lea 3====D'
};

const API = `https://gameathon.mifiel.com/api/v1/games/${params.game}`;

const ws = new WebSocket('wss://gameathon.mifiel.com/cable');

let blocks, pool, target;

getMerkleHash = () => {
  return '123-456-abc';
}

getPartialBlockHeader = () => {
  const lastBlock = blocks.pop();
  const lastTransaction = pool.pop();
  return `${params.version}|${lastBlock.hash}|${getMerkleHash()}|${target}|${params.message}|`;
}

ws.on('open', () => {
  const data = {
    command: 'subscribe',
    identifier: JSON.stringify(params)
  }

  axios
    .get(`${API}/blocks`)
    .then((responseBlocks) => {
      blocks = responseBlocks.data;

      axios
      .get(`${API}/pool`)
      .then((responsePool) => {
        pool = responsePool.data;

        axios
          .get(`${API}/target`)
          .then((responseTarget) => {
            target = responseTarget.data.target;

            getPartialBlockHeader();
          })
      });
    });

  ws.send(JSON.stringify(data));
});

ws.on('message', (event) => {
  // console.log(event)
});

