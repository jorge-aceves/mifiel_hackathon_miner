const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto')
const child_process = require('child_process')
const pry = require('pryjs');
const config = require('./config');
const utils = require('./utils');
const api = require('./api');

const params = config.params;

const ws = new WebSocket(`wss://gameathon.mifiel.com/cable`);

let maxCount = 100000000;
let offset = 0;
let miners = [];
let blocks = [], pool = [], target, lastBlock;
const threads = 4;
const halvingAmount = 90;

let minedBlock = {
  prev_block_hash: null,
  hash: null,
  height: null,
  message: params.message,
  merkle_root: null,
  reward: null,
  nonce: null,
  nickname: params.nickname,
  target: null,
  created_at: null,
  size: null,
  transactions: []
}

let looking_for_block = {};

makeid = () => {
  let text = "";
  const possible = "ABCDEF0123456789";

  for (let i = 0; i < 10; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

getMerkleRoot = (transactions) => {
  let arr = transactions;
  if(arr.length == 1) return arr[0];
  while(arr.length > 1){
    new_arr = []
    if (arr.length % 2 !== 0) {
      arr.push(arr[arr.length - 1]);
    }
    while(arr.length > 0){
      new_arr.push(doubleHash(Buffer.concat([Buffer.from(arr.shift(), 'hex'), Buffer.from(arr.shift(), 'hex')]).toString('hex')))
    }
    arr = new_arr;
  }
  return arr[0];
}

chooseTransactions = () => {
  return pool.slice(0,100);
}

getFee = (tx) => {
  if(typeof(tx) === 'number') return tx;
  let inputSum = tx.inputs.reduce((i1, i2) => i1.amount + i2.amount, {amount: 0})
  let outputSum = tx.outputs.reduce((o1, o2) => o1.value + o2.value, {value: 0})
  return inputSum - outputSum;
}

getPartialBlockHeader = (block) => {
  let blockTx = chooseTransactions();
  let halves = Math.floor(lastBlock.height / halvingAmount)
  let reward = 5000000000;
  for(let i = 0; i < halves; i++){
    reward /= 2;
  }
  let amount = blockTx.reduce((tx1, tx2) => getFee(tx1) + getFee(tx2), reward)
  //let amount = reward 
  let coinbaseTrans = {
    inputs: [
      {
        prev_hash: "0000000000000000000000000000000000000000000000000000000000000000",
        vout: -1,
        script_sig: makeid()
      }
    ],
    outputs: [
      {
        value: amount,
        script: 'fb6d05ac4b08fdc028ee642ea813c7ac1107f356'
      }
    ]
  }
  const coinbaseHash = getTransactionHash(coinbaseTrans);
  coinbaseTrans.hash = coinbaseHash;

  minedBlock.transactions = [coinbaseTrans, ...blockTx ];
  //minedBlock.transactions = [coinbaseTrans];
  minedBlock.merkle_root = getMerkleRoot(minedBlock.transactions.map((t) => t.hash));

  return `${params.version}|${block.hash}|${minedBlock.merkle_root}|${target}|${params.message}|`;
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
  let inputt = Buffer.concat(transaction.inputs.map(inp => {
    prev = hexBinary(inp.prev_hash)
    script = hexBinary(inp.script_sig)
    vout = new Buffer(`${inp.vout}`)
    return Buffer.concat([
      prev,
      script,
      vout
    ]);
  }));
  let output = Buffer.concat(transaction.outputs.map(out => {
    let scr = hexBinary(out.script)
    return Buffer.concat([
      new Buffer(`${out.value}`),
      new Buffer(`${scr.length}`),
      scr
    ]);
  }));
  const buffers = Buffer.concat([
    new Buffer(params.version),
    new Buffer(`${transaction.inputs.length}`),
    inputt,
    new Buffer(`${transaction.outputs.length}`),
    output,
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
  while (miners.length < threads) {
    miners.push(undefined);
  }
  const diff = maxCount / threads;
  let val = 0;
  for (let i = 0; i < threads; i++) {
    val = (i * diff) + offset;
    proc = child_process.exec(`./miner.js -s '${val}' -e '${val + diff}' -h '${blockHeader}' -t '${target}' -i '${i}'`, (err, stdout, stderr) => {
      post = looking_for_block[height]
      if(!post) return;
      let std;
      if (err) {
        if(err.killed){
          return;
        }
        if (allMinersClear() && looking_for_block[height]) {
          std = JSON.parse(stderr);
          miners[std.id] = undefined;
          offset += maxCount;
          maxCount += 100000000;
          setTimeout(callMiners(blockHeader, height), 0);
        }
        return;
      }
      std = JSON.parse(stdout);
      miners[std.id] = undefined;
      looking_for_block[height] = false;
      stopMiners();
      console.log('minamos', std.nonce, std.hash);
      postBlock(std.nonce, std.hash);
    })
    miners[i] = proc;
  }
}

stopMiners = () => {
  for(let i = 0; i < threads; i++){
    if(miners[i] !== undefined){
      miners[i].kill();
      miners[i] = undefined;
    }
  }
}


ws.on('open', () => {
  const data = {
    command: 'subscribe',
    identifier: JSON.stringify(params)
  }

  utils
    .start()
    .then(values => {
      blocks = values.blocks;
      pool = values.pool;
      target = values.target;
      maxCount = 100000000;
      offset = 0;
      lastBlock = blocks[blocks.length - 1]
      onBlockFound(lastBlock)
    })

  ws.send(JSON.stringify(data));
});

ws.on('message', (event) => {
  event = JSON.parse(event);

  if (event.message && event.message.type === 'block_found') {
    onBlockFound(event.message.data);
  }
  if (event.message && event.message.type === 'new_transaction') {
    onNewTransaction(event.message.data);
  }
  if (event.message && event.message.type === 'target_changed') {
    onTargetChange(event.message.data);
  }
});


const postBlock = (nonce, hash) => {
  minedBlock.used_target = target
  minedBlock.height = lastBlock.height + 1;
  minedBlock.prev_block_hash = lastBlock.hash;
  minedBlock.nonce = nonce;
  minedBlock.hash = hash;

  api
    .blockFound(minedBlock)
    .then(response => {
      console.log('postBlock', response);
    })
    .catch(error => {
      console.log(error)
    })
}

const onBlockFound = (block) => {
  stopMiners();
  api
    .getPool()
    .then(newPool => {
      pool = newPool;
      console.log('onBlockFound', block);
      lastBlock = block;

      looking_for_block[blocks[blocks.length - 1].height] = false;
      looking_for_block[block.height] = true;
      callMiners(getPartialBlockHeader(block), block.height);
      blocks.push(block);
    })
    .catch(err => {
      console.log('Error en onBlockFound', err);
    })

}

const onNewTransaction = (transaction) => {
  console.log('onNewTransaction', transaction);
  pool.push(transaction);
}


const onTargetChange = (newTarget) => {
  console.log('onTargetChange', newTarget);
  target = newTarget;
}