const api = require('./api');
const config = require('./config');

const { outputScriptCoinBase } = config.params;

const signedTransaction = {
    input: [],
    output: []
};

api
    .getOurMinedBlocks()
    .then(blocks => {
        formSignedTransactions(blocks);
    })
    .catch(error => {
        console.log(error)
    })


formSignedTransactions = (blocks) => {
    const inputs = [];

    let input, currentOutput;
    blocks.map((block) => {
        input = [];
        outputSum = 0;

        block.transactions.map(transction => {
            currentOutput = [];
            currentOutput = transction.outputs.filter(output => {
                return output.script === outputScriptCoinBase;
            });
            if (currentOutput.length > 0) {
                input.push({
                    prev_hash: transction.hash,
                    vout: 0,
                    script_sig: 'firma de este we',
                    amount: currentOutput[0].value,
                });
                outputSum += currentOutput[0].value;
            }
        });
    });


    console.log('input', inputs);
    console.log('outputSum', outputSum);
};