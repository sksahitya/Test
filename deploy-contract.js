const CONF = require('@ideadesignmedia/config.js')
const fs = require('fs');
const path = require('path')
const solc = require('solc');
const smtchecker = require('solc/smtchecker');
const smtsolver = require('solc/smtsolver');
const ethers = require('ethers')
const FormData = require('form-data');
const contractName = 'BlackJack';
const contractSource = './contracts/compile-blackjack.sol'
const sourceCode = fs.readFileSync(contractSource, 'utf8')
const runs = 1000
const constructorArguments = ['0xF52137bc13D3C4cD9E0f8a64Dd44Ac34AFF23FD4', '20']
const { provider, wallet } = require('./wallet')
const input = JSON.stringify({
    language: 'Solidity',
    sources: {
        [contractName]: {
            content: sourceCode,
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
console.log('Compiled contract without errors')
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
    if (estimate.toNumber() > 9262437) throw new Error('Gas is too high')
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
        try {
            const verifyData = new FormData()
            const data = {
                apikey: process.env.ETHERSCAN_API_KEY,
                module: 'contract',
                action: 'verifysourcecode',
                contractaddress: contract.address,
                sourceCode,
                contractname: contractName,
                compilerversion: 'v0.8.17+commit.8df45f5f',
                optimizationUsed: '1',
                runs: runs.toString(),
                constructorArguments: constructorArguments.join(','),
                licenseType: '5'
            }
            for (const key in data) {
                verifyData.append(key, data[key])
            }
            console.log('Verifying contract on Etherscan')
            verifyData.submit('https://api-goerli.etherscan.io/', (err, resp) => {
                if (err) return console.log(`Failed to verify contract:`, err)
                console.log(`Successfully verified contract:`, resp)
            })
        } catch(e) {
            console.log(e)
        }
    }).catch(e => {
        console.log('rejected', e)
    })
})();