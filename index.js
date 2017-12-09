const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto')
const child_process = require('child_process')

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

let maxCount = 100000000;
let offset = 0;
let miners = [];

let blocks, pool, target;

let looking_for_block = {};

getMerkleHash = (transactions) => {
  if (transactions.length == 1){
    return transactions[0].hash;
  }
  arr = transactions;
  return '123-456-abc';
}

getPartialBlockHeader = (block) => {
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
  return `${params.version}|${block.hash}|${getMerkleHash(transactions)}|${target}|${params.message}|`;
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

allMinersClear = () => {
  let valid = true
  miners.forEach((miner) => { if(miner !== undefined) valid = false; })
  return valid;
}

callMiners = (blockHeader, height) => {
  const threads = 4;
  while(miners.length < threads){
    miners.push(undefined);
  }
  const diff = maxCount / threads;
  let val = 0;
  for(let i = 0; i < threads; i++){
    val = (i * diff) + offset;
    miners[i] = 'pid'
    child_process.exec(`./miner.js -s '${val}' -e '${val + diff}' -h '${blockHeader}' -t '${target}' -i '${i}'`, (err, stdout, stderr) => {
      if(err) {
        std = JSON.parse(stderr);
        miners[std.id] = undefined;
        if(allMinersClear()){
          if(looking_for_block[height]){            
            offset += maxCount;
            maxCount += 100000000;
            callMiners(blockHeader, height);
          } else if(looking_for_block[height+1]){
            callMiners(getPartialBlockHeader([blocks[blocks.length - 1]]), height+1);
          }
        }
        return;
      }
      std = JSON.parse(stdout)
      miners[std.id] = undefined
      looking_for_block[height] = false;
      postBlock(std.nonce, std.hash);
    })
  }
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
            maxCount = 100000000;
            offset = 0;
            lastBlock = blocks[blocks.length - 1];
            looking_for_block[lastBlock.height] = true;
            if(allMinersClear()){
              callMiners(getPartialBlockHeader(lastBlock), lastBlock.height);
            }
          })
      });
    });

  ws.send(JSON.stringify(data));
});

ws.on('message', (event) => {
  // console.log(event)
});

