const contractName = 'BlackJack';
const contractSource = './contracts/blackjack.sol'
const runs = 1000
const constructorArguments = ['0x8a3C54067E94Df01653F6Cf6eB33A9d27481Ad1b', '10', '35']
const fs = require('fs');
const path = require('path')
const solc = require('solc');
const smtchecker = require('solc/smtchecker');
const smtsolver = require('solc/smtsolver');
const ethers = require('ethers')
const { provider, wallet } = require('./wallet')
const input = JSON.stringify({
    language: 'Solidity',
    sources: {
        [contractName]: {
            content: fs.readFileSync(contractSource, 'utf8'),
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', "evm.bytecode"]
            },
        },
        optimizer: { enabled: true, runs }
    },
});
function findImports(relativePath) {
    //my imported sources are stored under the node_modules folder!
    const absolutePath = path.resolve(__dirname, 'contracts', relativePath);
    const source = fs.readFileSync(absolutePath, 'utf8');
    return { contents: source };
}
const output = JSON.parse(solc.compile(input, { import: findImports, smtSolver: smtchecker.smtCallback(smtsolver.smtSolver, smtsolver.availableSolvers[0]) }));
if (output.errors && output.errors.length) throw console.log(output.errors)
const { contracts } = output;
const encodedContract = contracts[contractName];
const abi = encodedContract[contractName].abi;
const bytecode = encodedContract[contractName].evm.bytecode.object;
const factory = new ethers.ContractFactory(abi, bytecode).connect(wallet)
!(async () => {
    if (!abi || !bytecode) throw new Error('Missing required')
    const { gasPrice, gasLimit } = await provider.getBlock('latest').then(block => ({ gasLimit: block.gasLimit, gasPrice: block.baseFeePerGas }))
    const balance = await provider.getBalance(wallet.address)
    const estimate = await wallet.estimateGas(factory.getDeployTransaction(...constructorArguments))
    console.log('balance', balance.toString(), 'estimated gas', estimate.toString(), 'gas price', gasPrice.toString(), 'gas limit', gasLimit.toString())
    const contract = await factory.deploy(...constructorArguments, { gasPrice })
    contract.deployTransaction.wait().then(() => {
        console.log('SUCCESSFULLY DEPLOYED NEW CONTRACT AT:', contract.address)
        console.log('TRANSACTION FOR THE DEPLOYMENT', contract.deployTransaction.hash)
        fs.writeFile('./contract-byte-code.txt', bytecode, (err) => {
            if (err) return console.log(err);
            console.log('Bytecode saved!');
        })
        fs.writeFile('./contract-abi.json', JSON.stringify(abi), (err) => {
            if (err) return console.log(err);
            console.log('ABI saved!');
        })
    }).catch(e => {
        console.log('rejected')
    })
})();