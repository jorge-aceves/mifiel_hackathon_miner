#!/usr/bin/env node

const program = require('commander');
const crypto = require('crypto');

function doubleHash(message){
	sha256 = hasher(message).digest();	
	return hasher(sha256).digest('hex');
}

function hasher(message){
	return crypto.createHash('sha256').update(message);
}

program
	.version('0.1.0')
	.option('-s, --start <number>', 'Start')
	.option('-e, --end <number>', 'End')
	.option('-i, --id <number>', 'ID')
	.option('-t --target <number>', 'Target')
	.option('-h, --header <header>', 'Header')
	.parse(process.argv);


let start = parseInt(program.start);
const end = parseInt(program.end);
const header = program.header;
const message = [header];
const targetVal = parseInt(program.target, 16);
let messageVal = targetVal;
let fullMessage = '';

while(start < end){
	message.push(start);
	fullMessage = message.join('');
	messageVal = parseInt(doubleHash(fullMessage), 16);
	if(messageVal < targetVal){
		break;
	}
	message.pop();
	start++;
}

if(start == end){
	console.error(JSON.stringify({id: program.id}));
	process.exit(1);
}

console.log(JSON.stringify({id: program.id, nonce: start, hash: doubleHash(fullMessage)}));