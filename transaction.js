const bitcoin = require('bitcoinjs-lib');
const api = require('api');
const config = require('config');

const { nickname } = config.params;

const ownBlocks;

api
    .getBlocks()
    .then(blocks => {
        ownBlocks = [];
        blocks.forEach(block => {
            if (block.user = nickname) {
                let ownTransction : {}

            }
        });
    })
    .catch(error => {
        console.log(error)
    })
