const api = require('./api');
const config = require('./config');
const pry = require('pryjs')

const { outputScriptCoinBase } = config.params;

const signedTransaction = {
    input: [],
    output: []
};

let inputs = [], totalOutputSum = 0, outputs = [];
let dh = '', txHash = '';


api
    .getOurMinedBlocks()
    .then(blocks => {
        formUnsignedTransactions(blocks);
        formOutputs();
        txHash = getTransactionHash();
    })
    .catch(error => {
        console.log(error)
    })


getTransactionHash = () => {
  let inputt = Buffer.concat(inputs.map(inp => {
    prev = hexBinary(inp.prev_hash)
    script = hexBinary(inp.script_sig)
    vout = new Buffer(`${inp.vout}`)
    return Buffer.concat([
      prev,
      script,
      vout
    ]);
  }));
  let output = Buffer.concat(outputs.map(out => {
    let scr = hexBinary(out.script)
    return Buffer.concat([
      new Buffer(`${out.value}`),
      new Buffer(`${scr.length}`),
      scr
    ]);
  }));
  const buffers = Buffer.concat([
    new Buffer(params.version),
    new Buffer(`${inputs.length}`),
    inputt,
    new Buffer(`${outputs.length}`),
    output,
    new Buffer('0')
  ]);
  dh = doubleHash(buffers);
  return reverseString(dh);
}


formUnsignedTransactions = (blocks) => {
    let inputs = [];
    let currentOutput;
    blocks.forEach((block) => {
        block.transactions.forEach(tx => {
            currentOutput = tx.outputs.filter(output => {
                return output.script === outputScriptCoinBase;
            })[0];
            if (currentOutput) {
                inputs.push({
                    prev_hash: tx.hash,
                    vout: 0,
                    script_sig: outputScriptCoinBase,
                    amount: currentOutput.value,
                });
                totalOutputSum += currentOutput.value;
            }
        });
    });
    return;
};

formOutputs = () => {
    outputs.push({
        value: totalOutputSum,
        script: 'Genaro'
    })
    return;
}