const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto')
const exec = require('child_process')

const params = {
  channel: 'MiniBlockchainChannel',
  nickname: 'saltygeorge',
  uuid: 'bc70293f-81ed-4ced-8f45-8f807bbc301f',
  game: 'testnet',
  version: '1',
  message: 'Puto el que lo lea 8====D'
};

const API = `https://gameathon.mifiel.com/api/v1/games/${params.game}`;

const ws = new WebSocket('wss://gameathon.mifiel.com/cable');

let blocks, pool, target;

let miners = [];

getMerkleHash = (transactions) => {
  if (transactions.length == 1){
    return transactions[0].hash;
  }
  arr = transactions;
  return '123-456-abc';
}

getPartialBlockHeader = () => {
  const lastBlock = blocks.pop();
  let coinbaseTrans = {
    inputs: [
      {
        prev_hash: "0000000000000000000000000000000000000000000000000000000000000000",
        vout: -1,
        script_sig: "12345678901234567890"
      }
    ],
    outputs: [
      {
        value: 5000000000,
        script: '03627eac6729a1f3f210dbfba4f9e21d6bfdce764e00b7559cc68a7551ddd839bf'
      }
    ]
  }
  const coinbaseHash = getTransactionHash(coinbaseTrans);
  coinbaseTrans.hash = coinbaseHash;
  const transactions = [coinbaseTrans];
  return `${params.version}|${lastBlock.hash}|${getMerkleHash(transactions)}|${target}|${params.message}|`;
}

reverseString = (str) => {
  let l=str.length, s='';
  while(l > 0) {
    l--;
    s+= str[l];
  }
  return s;
}

getTransactionHash = (transaction) => {
 let inputt = Buffer.concat(transaction.inputs.map(input => {
   return Buffer.concat([
     new Buffer(input.prev_hash),
     new Buffer(input.script_sig),
     new Buffer(`${input.vout}`)
   ]);
 }));
 let outputt = Buffer.concat(transaction.outputs.map(output => {
   return Buffer.concat([
     new Buffer(`${output.value}`),
     new Buffer(`${output.script.length}`),
     new Buffer(output.script)
   ]);
 }));
 const buffers = Buffer.concat([
    new Buffer(params.version),
    new Buffer(`${transaction.inputs.length}`),
    inputt,
    new Buffer(`${transaction.outputs.length}`),
    outputt,
    new Buffer('0')
  ]);
 return reverseString(crypto.createHash('sha256').update(buffers).digest('hex'));
}

callMiners = (blockHeader) => {

}

stopMiners = () => {

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
            console.log("nos llego un bloque")
            console.log(getPartialBlockHeader());
          })
      });
    });

  ws.send(JSON.stringify(data));
});

ws.on('message', (event) => {
  // console.log(event)
});

