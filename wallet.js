const config = require('@ideadesignmedia/config.js')
const ethers = require('ethers')
const provider = new ethers.providers.StaticJsonRpcProvider(process.env.RPC_URI || 'https://mainnet.infura.io/v3/fc9c5693af6d40afa0e8ef96d95bf69d')
const privateKey = process.env.PRIVATE_KEY
var wallet = / /.test(privateKey) ? new ethers.Wallet.fromMnemonic(privateKey) : new ethers.Wallet(privateKey)
wallet = wallet.connect(provider)
module.exports = { provider, wallet }