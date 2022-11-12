const fs = require('fs');
const solc = require('solc');
const ethers = require('ethers')
const provider = new ethers.providers.StaticJsonRpcProvider('https://mainnet.infura.io/v3/fc9c5693af6d40afa0e8ef96d95bf69d')
var account = new ethers.Wallet.fromMnemonic('broken aware pistol spare remind short column enlist radio debris whisper tower')
account = account.connect(provider)
const input = JSON.stringify({
    language: 'Solidity',
    sources: {
        'CasinoCoin': {
            content: fs.readFileSync('./contracts/casino-coin.sol', 'utf8'),
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', "evm.bytecode"]
            },
        },
    },
});
const output = JSON.parse(solc.compile(input));
const { contracts } = output;
const { CasinoCoin } = contracts;
const abi = CasinoCoin.Coin.abi;
const bytecode = CasinoCoin.Coin.evm.bytecode.object;
const factory = new ethers.ContractFactory(abi, bytecode).connect(account)
const constructorArguments = []
!(async () => {
    const { gasPrice } = await provider.getBlock('latest').then(block => ({ gasLimit: block.gasLimit, gasPrice: block.baseFeePerGas }))
    const balance = await provider.getBalance(account.address)
    const estimate = await account.estimateGas(factory.getDeployTransaction(...constructorArguments))
    console.log('balance', balance.toString(), 'estimated gas', estimate.toString())
    const contract = await factory.deploy(...constructorArguments, { gasPrice })
    contract.deployTransaction.wait().then(() => {
        console.log('SUCCESSFULLY DEPLOYED NEW CONTRACT AT:', contract.address)
        console.log('TRANSACTION FOR THE DEPLOYMENT', contract.deployTransaction.hash)
    }).catch(e => {
        console.log(e)
    })
})();