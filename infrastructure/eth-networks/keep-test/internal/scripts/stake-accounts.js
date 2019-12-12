const fs = require('fs');
const Web3 = require('web3');

// ETH host info
const ethHost = 'http://eth-tx.test.keep.network';
const ethWsPort = '8546';
const ethRpcPort = '8545';
const ethNetworkId = '1101';

/*
We override transactionConfirmationBlocks and transactionBlockTimeout because they're
25 and 50 blocks respectively at default.  The result of this on small private testnets
is long wait times for scripts to execute.
*/
const web3_options = {
    defaultBlock: 'latest',
    defaultGas: 4712388,
    transactionBlockTimeout: 25,
    transactionConfirmationBlocks: 3,
    transactionPollingTimeout: 480
};
const web3 = new Web3(new Web3.providers.HttpProvider(ethHost + ':' + ethRpcPort), null, web3_options);

const assignedAccounts = [
  '0x48f4bb2cf7379467c3052cb8c5d9e3892eeda487',
  '0x307bed667e177c7851779da0612c824d56ba097b',
  '0xa924d3a62b2d515235e5de5d903c405cba7f0e86',
  '0x4902de99499ee74159779c0d92dd163bf689daf0'
  ]

/*
Each <contract.json> file is sourced directly from the InitContainer.  Files are generated by
Truffle during contract and copied to the InitContainer image via Circle.
*/

// TokenStaking
const tokenStakingContractJsonFile = '../TokenStaking.json';
const tokenStakingContractParsed = JSON.parse(fs.readFileSync(tokenStakingContractJsonFile));
const tokenStakingContractAbi = tokenStakingContractParsed.abi;
const tokenStakingContractAddress = tokenStakingContractParsed.networks[ethNetworkId].address;
const tokenStakingContract = new web3.eth.Contract(tokenStakingContractAbi, tokenStakingContractAddress);

// KeepToken
const keepTokenContractJsonFile = '../KeepToken.json';
const keepTokenContractParsed = JSON.parse(fs.readFileSync(keepTokenContractJsonFile));
const keepTokenContractAbi = keepTokenContractParsed.abi;
const keepTokenContractAddress = keepTokenContractParsed.networks[ethNetworkId].address;
const keepTokenContract = new web3.eth.Contract(keepTokenContractAbi, keepTokenContractAddress);

async function stakeOperatorAccount(operator, contractOwner) {

  let ethAccountPassword = 'doughnut_armenian_parallel_firework_backbite_employer_singlet';

  await web3.eth.personal.unlockAccount(operator, ethAccountPassword, 150000);
  await web3.eth.personal.unlockAccount(contractOwner, ethAccountPassword, 150000);


  let magpie = contractOwner;
  let contractOwnerSigned = await web3.eth.sign(web3.utils.soliditySha3(contractOwner), operator);

  /*
  This is really a bit stupid.  The return from web3.eth.sign is different depending on whether or not
  the signer is a local or remote ETH account.  We use web3.eth.sign to set contractOwnerSigned. Here
  the bootstrap peer account already exists and is hosted on an ETH node.
  */

  let delegation = '0x' + Buffer.concat([
    Buffer.from(magpie.substr(2), 'hex'), 
    Buffer.from(contractOwnerSigned.substr(2), 'hex')]).toString('hex');

  console.log('Staking 1000000 KEEP tokens on operator account ' + operator);

  await keepTokenContract.methods.approveAndCall(
    tokenStakingContract.address,
    formatAmount(10000000, 18),
    delegation).send({from: contractOwner})

  console.log('Account ' + operator + ' staked!');
};

function formatAmount(amount, decimals) {
  return '0x' + web3.utils.toBN(amount).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals))).toString('hex');
};

assignedAccounts.forEach(account =>
  stakeOperatorAccount(account, '0x0F0977c4161a371B5E5eE6a8F43Eb798cD1Ae1DB').catch(error => {
  console.error(error);
  process.exit(1);
  })
);
