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
  message: 'Jorge >>>>> Aldo, Edgar >>>> Juan, Ramses >>>> Marcos'
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
  if (transactions.length == 1) {
    return transactions[0].hash;
  }
  let arr = transactions;
  do{  
    new_arr = []
    if(arr.length % 2 !== 0){
      arr.push(transactions[transactions.length - 1]);
    } 
    new_arr.push(doubleHash(Buffer.concat([Buffer.from(arr.shift(), 'hex'), Buffer.from(arr.shift(), 'hex')])))
    arr = new_arr;
  } while(arr.size > 1);
  return arr[0];
}

getPartialBlockHeader = (block) => {
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
        value: 5000000000,
        script: '03627eac6729a1f3f210dbfba4f9e21d6bfdce764e00b7559cc68a7551ddd839bf'
      }
    ]
  }
  const coinbaseHash = getTransactionHash(coinbaseTrans);
  coinbaseTrans.hash = coinbaseHash;

  minedBlock.transactions = [coinbaseTrans];
  minedBlock.merkle_root = getMerkleRoot(minedBlock.transactions);
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
  let input = Buffer.concat(transaction.inputs.map(inp => {
    prev = hexBinary(inp.prev_hash)
    script = new Buffer(inp.script_sig)
    vout = new Buffer(`${inp.vout}`)
    return Buffer.concat([
      prev,
      script,
      vout
    ]);
  }));
  let output = Buffer.concat(transaction.outputs.map(out => {
    return Buffer.concat([
      new Buffer(`${out.value}`),
      new Buffer(`${out.script.length}`),
      hexBinary(out.script)
    ]);
  }));
  const buffers = Buffer.concat([
    new Buffer(params.version),
    new Buffer(`${transaction.inputs.length}`),
    input,
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
              lastBlock = blocks[blocks.length - 1]
              onBlockFound(lastBlock)
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
  minedBlock.used_target = target
  minedBlock.height = lastBlock.height + 1;
  minedBlock.prev_block_hash = lastBlock.hash;
  minedBlock.nonce = nonce;
  minedBlock.hash = hash;

  axios.post(`${API}/block_found`, minedBlock)
    .then(response => {
      console.log('postBlock', response);
    })
    .catch(error => {
      console.log(error)
    })
}

const onBlockFound = (block) => {
  console.log('onBlockFound', block);
  lastBlock = block;
  looking_for_block[blocks[blocks.length - 1].height] = false;
  looking_for_block[block.height] = true;
  if (allMinersClear()) {
    callMiners(getPartialBlockHeader(block), block.height);
  }
  blocks.push(block);
}
