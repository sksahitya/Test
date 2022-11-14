const ethers = require('ethers')
const provider = new ethers.providers.StaticJsonRpcProvider('https://mainnet.infura.io/v3/fc9c5693af6d40afa0e8ef96d95bf69d')
var account = new ethers.Wallet.fromMnemonic('broken aware pistol spare remind short column enlist radio debris whisper tower')
account = account.connect(provider)
module.exports = {library: provider, wallet: account}