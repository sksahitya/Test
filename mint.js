const contractAddress = '0xe63B97fE90Ef88f228cAaF94e97Ff48307A775b1'
const abi = require('./abis/coin.json')
const ethers = require('ethers')
const {library, wallet} = require('./wallet')
const contract = new ethers.Contract(contractAddress, abi, wallet)
const getTransactionResult = (txReceipt, contract, eventName, isMany) => {
    if (!txReceipt) throw new Error('No transaction receipt')
    let { status, logs } = txReceipt
    if (status === 0) throw new Error('Transaction failed')
    if (!eventName || !contract) return null
    if (isMany) {
        let names = eventName instanceof Array ? eventName : typeof eventName === 'string' ? eventName.split(',').map(u => u.trim()) : null
        if (!names) return null
        let events = []
        let topics = names.map(name => ({ name, topic: contract.interface.getEventTopic(name) }))
        for (let i = 0; i < logs.length; i++) {
            let log = logs[i]
            let logName
            let hasTopic = log.topics.find(t => {
                let index = topics.findIndex(u => u.topic === t)
                if (index > -1) {
                    logName = topics[index].name
                    return true
                }
            })
            if (hasTopic) {
                let { args } = contract.interface.parseLog(log)
                events.push({ name: logName, result: args })
            }
        }
        return events
    } else {
        try {
            let topic = contract.interface.getEventTopic(eventName)
            let log = logs.find(log => log.topics.indexOf(topic) >= 0)
            if (!log) return null
            let { args } = contract.interface.parseLog(log)
            return args
        } catch (e) {
            console.error(e)
            return null
        }
    }
}
const waitForResponse = (transactionRequest, eventName, isMany = false) => {
    return new Promise(async (res, rej) => {
        if (!transactionRequest) return rej('No transaction request')
        let { hash } = transactionRequest
        if (!hash) return rej('No transaction hash')
        let receipt = await library.waitForTransaction(hash, 1, 1000 * 60 * 60 * 20).catch(e => console.error(e))
        if (!receipt) return rej('Unable to confirm transaction')
        try {
            res(getTransactionResult(receipt, contract, eventName, isMany))
        } catch (e) {
            return rej(e)
        }
    })
}
module.exports = function mint(address, amount) {
    return new Promise((res, rej) => contract.mint(address, amount).then(tx => waitForResponse(tx)).then(() => res()).catch(e => rej(e)))
}