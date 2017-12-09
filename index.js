const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto')
const child_process = require('child_process')
const pry = require('pryjs');

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

let blocks, pool, target, lastBlock;

let minedBlock = {
  prev_block_hash: null,
  hash: null,
  height: null,
  message: params.message,
  merkle_hash: null,
  reward: null,
  nonce: null,
  nickname: params.nickname,
  target: null,
  created_at: null,
  size: null,
  transactions: []
}

let looking_for_block = {};

getMerkleHash = (transactions) => {
  if (transactions.length == 1) {
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
  eval(pry.it)
  coinbaseTrans.hash = coinbaseHash;

  minedBlock.transactions = [coinbaseTrans];
  minedBlock.merkle_hash = getMerkleHash(minedBlock.transactions);

  return `${params.version}|${block.hash}|${minedBlock.merkle_hash}|${target}|${params.message}|`;
}

reverseString = (str) => {
  let l = str.length, s = '';
  while (l > 0) {
    l--;
    s += str[l];
  }
  return s;
}

hexBinary = (hexStr) => {
  return Buffer.from(hexStr, "hex")
}

doubleHash = (message) => {
  sha256 = hasher(message).digest();  
  return hasher(sha256).digest('hex');
}

hasher = (message) => {
  return crypto.createHash('sha256').update(message);
}

getTransactionHash = (transaction) => {
  let inputt = Buffer.concat(transaction.inputs.map(input => {
    return Buffer.concat([
      hexBinary(input.prev_hash),
      hexBinary(input.script_sig),
      new Buffer(`${input.vout}`)
    ]);
  }));
  let outputt = Buffer.concat(transaction.outputs.map(output => {
    return Buffer.concat([
      new Buffer(`${output.value}`),
      new Buffer(`${output.script.length}`),
      hexBinary(output.script)
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
  return reverseString(doubleHash(buffers));
}

allMinersClear = () => {
  let valid = true
  miners.forEach((miner) => { if (miner !== undefined) valid = false; })
  return valid;
}

callMiners = (blockHeader, height) => {
  const threads = 4;
  while (miners.length < threads) {
    miners.push(undefined);
  }
  const diff = maxCount / threads;
  let val = 0;
  for (let i = 0; i < threads; i++) {
    val = (i * diff) + offset;
    miners[i] = 'pid'
    child_process.exec(`./miner.js -s '${val}' -e '${val + diff}' -h '${blockHeader}' -t '${target}' -i '${i}'`, (err, stdout, stderr) => {
      if (err) {
        std = JSON.parse(stderr);
        miners[std.id] = undefined;
        if (allMinersClear()) {
          if (looking_for_block[height]) {
            offset += maxCount;
            maxCount += 100000000;
            callMiners(blockHeader, height);
          } else if (looking_for_block[height + 1]) {
            callMiners(getPartialBlockHeader([blocks[blocks.length - 1]]), height + 1);
          }
        }
        return;
      }
      std = JSON.parse(stdout)
      miners[std.id] = undefined
      post = looking_for_block[height] 
      looking_for_block[height] = false;
      if(post) console.log('minamos', std.nonce, std.hash);
      if(post) postBlock(std.nonce, std.hash);
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
              if (allMinersClear()) {
                getPartialBlockHeader(lastBlock)
                //callMiners(getPartialBlockHeader(lastBlock), lastBlock.height);
              }
            })
        });
    });

  ws.send(JSON.stringify(data));
});

ws.on('message', (event) => {
  // console.log(event)


  if (event.message && event.message.type === 'block_found') {
    onBlockFound(event.message.data);
  }
});


const postBlock = (nonce, hash) => {
  minedBlock.height = lastBlock.height + 1;
  minedBlock.prev_block_hash = lastBlock.hash;
  minedBlock.nonce = nonce;
  minedBlock.hash = hash;

  axios.post(`${API}/block_found`, minedBlock)
    .then(response => {
      console.log('postBlock', response);
    })
    .catch(error => {
      eval(pry.it)
      console.log(error)
    })
}

const onBlockFound = (block) => {
  console.log('onBlockFound', block);
  looking_for_block[blocks[blocks.length - 1].height] = false;
  looking_for_block[block.height] = true;
  blocks.push(block);
}
