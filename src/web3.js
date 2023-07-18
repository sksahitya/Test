import State from "@ideadesignmedia/swag";
import BigNumber from 'bignumber.js'
import { ethers, Contract, BigNumber as EthersBN, utils } from 'ethers'
import env from './env'
import { EthereumProvider } from '@walletconnect/ethereum-provider'
import { db as DB, makeModel } from '@ideadesignmedia/fe-db'
import multicallABI from './abi/Multicall.json'

BigNumber.config({ EXPONENTIAL_AT: [-100, 100] })

let walletConnect = EthereumProvider.init({
    projectId: env.projectId,
    chains: [1],
    optionalChains: env.availableChains, // number[] | required to support chains other than mainnet 
    showQrModal: true // requires @walletconnect/modal
}).then(wc => {
    walletConnect = wc
})

export const Web3Provider = () => {
    const account = new State(null)
    const chainId = new State(env.getChainId())
    const provider = new State(null)
    const setAccount = (val) => account.value = val
    const setChainId = (val) => chainId.value = val
    const setProvider = (val) => provider.value = val
    const { ethereum } = window
    const connect = async (connector) => {
        if (connector === 'walletconnect') {
            if (typeof walletConnect === 'object' && typeof walletConnect.then === 'function') await walletConnect
            if (!walletConnect) throw new Error('WalletConnect provider not found')
            const account = await walletConnect.enable().catch(e => {
                console.log('FAILED TO ENABLED WALLET CONNECT', e)
            })
            if (!account) return
            localStorage.setItem(env.CHAIN_ID_KEY, walletConnect.chainId)
            setChainId(walletConnect.chainId)
            setAccount(account[0])
            setProvider(new ethers.providers.Web3Provider(walletConnect))
            const handleConnect = () => {
                const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
                if (walletConnector !== 'walletconnect') return
                console.log('walletconnect connected')
            }
            const handleChainChanged = (chainHex) => {
                const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
                if (walletConnector !== 'walletconnect') return
                const chainId = parseInt(chainHex, 16)
                localStorage.setItem(env.CHAIN_ID_KEY, chainId)
                setChainId(chainId)
            }
            const handleAccountsChanged = (accounts) => {
                const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
                if (walletConnector !== 'walletconnect') return
                setAccount(accounts[0])
            }
            const handleDisconnect = () => {
                const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
                if (walletConnector !== 'walletconnect') return
                disconnect()
            }
            walletConnect.on('connect', handleConnect)
            walletConnect.on('chainChanged', handleChainChanged)
            walletConnect.on('accountsChanged', handleAccountsChanged)
            walletConnect.on('disconnect', handleDisconnect)
        } else {
            if (!ethereum) throw new Error('No provider found')
            await ethereum.request({ method: 'eth_requestAccounts' }).then(async accounts => {
                if (accounts.length > 0) {
                    const p = new ethers.providers.Web3Provider(ethereum)
                    setAccount(accounts[0])
                    setProvider(p)
                    p.getNetwork().then(({ chainId }) => {
                        localStorage.setItem(env.CHAIN_ID_KEY, chainId)
                        setChainId(chainId)
                    })
                }
            })
        }
    }
    const disconnect = () => {
        const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
        if (walletConnector === 'walletconnect' && walletConnect && typeof walletConnect.disconnect === 'function') {
            walletConnect.disconnect()
        }
        setAccount(null)
        setChainId(null)
        setProvider(ethereum ? new ethers.providers.Web3Provider(ethereum) : null)
        localStorage.removeItem(env.walletConnectKey)
    }
    const handleConnect = ({ chainId: chainHex }) => {
        const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
        if (walletConnector === 'walletconnect') return
        const chainId = parseInt(chainHex, 16)
        localStorage.setItem(env.CHAIN_ID_KEY, chainId)
        setChainId(chainId)
        connect()
    }
    const handleChainChanged = (chainHex) => {
        const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
        if (walletConnector === 'walletconnect') return
        const chainId = parseInt(chainHex, 16)
        localStorage.setItem(env.CHAIN_ID_KEY, chainId)
        setChainId(chainId)
    }
    const handleAccountsChanged = (accounts) => {
        const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
        if (walletConnector === 'walletconnect') return
        setAccount(accounts[0])
    }
    const handleDisconnect = () => {
        const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
        if (walletConnector === 'walletconnect') return
        disconnect()
    }
    if (ethereum && ethereum.on) {
        ethereum.on('connect', handleConnect)
        ethereum.on('chainChanged', handleChainChanged)
        ethereum.on('accountsChanged', handleAccountsChanged)
        ethereum.on('disconnect', handleDisconnect)
    }
    const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
    if (walletConnector) connect(walletConnector).catch(e => console.log(e))
    return { account, chainId, provider, connect, disconnect }
}
export default useWeb3
export const getProvider = (unsigned) => {
    if (unsigned) return new ethers.providers.StaticJsonRpcProvider(env.rpc())
    const walletConnector = localStorage.getItem(env.walletConnectKey) ?? undefined
    if (walletConnector === 'walletconnect') return walletConnect?.[0]?.connected ? new ethers.providers.Web3Provider(walletConnect) : new ethers.providers.StaticJsonRpcProvider(env.rpc())
    return window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : new ethers.providers.StaticJsonRpcProvider(env.rpc())
}
export const setupNetwork = async (chainId, provider) => {
    provider ||= window.ethereum
    if (provider) {
        const getSwitchParams = (chainId) => {
            switch (chainId) {
                case 1: return [
                    {
                        chainId: "0x1"
                    }
                ]
                case 1116: return [
                    {
                        chainId: "0x45c"
                    }
                ]
                case 280: return [
                    {
                        chainId: "0x118"
                    }
                ]
                case 324: return [
                    {
                        chainId: "0x144"
                    }
                ]
                case 42161: return [
                    {
                        chainId: "0xA4B1"
                    }
                ]
                case 56: return [
                    {
                        chainId: "0x38"
                    }
                ]
                case 97: return [
                    {
                        chainId: "0x61"
                    }
                ]
                case 5: return [
                    {
                        chainId: "0x5"
                    }
                ]
                case 421613: return [
                    {
                        chainId: "0x66EED",
                    }
                ]
                default: return [
                    {
                        chainId: "0xA4B1"
                    }
                ]
            }
        }
        return await provider.request({
            method: 'wallet_switchEthereumChain',
            params: getSwitchParams(chainId)
        }).catch(async e => {
            console.log(e)
            if (e.code === 4001) return
            const getParams = (chainId) => {
                switch (chainId) {
                    case 1: return [
                        {
                            chainId: "0x1",
                            rpcUrls: [env.rpc(1)],
                            chainName: 'Mainnet',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(1)]
                        }
                    ]
                    case 1116: return [
                        {
                            chainId: "0x45c",
                            rpcUrls: [env.rpc(1116)],
                            chainName: 'Core Blockchain',
                            nativeCurrency: {
                                name: 'CORE',
                                symbol: 'CORE',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(1116)]
                        }
                    ]
                    case 56: return [
                        {
                            chainId: "0x38",
                            rpcUrls: [env.rpc(56)],
                            chainName: 'Binance Smart Chain',
                            nativeCurrency: {
                                name: 'BNB',
                                symbol: 'BNB',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(56)]
                        }
                    ]
                    case 97: return [
                        {
                            chainId: "0x61",
                            rpcUrls: [env.rpc(56)],
                            chainName: 'Binance Testnet',
                            nativeCurrency: {
                                name: 'BNB',
                                symbol: 'BNB',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(97)]
                        }
                    ]
                    case 5: return [
                        {
                            chainId: "0x5",
                            rpcUrls: [env.rpc(5)],
                            chainName: 'Goerli Testnet',
                            nativeCurrency: {
                                name: 'Goerli ETH',
                                symbol: 'goETH',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(5)]
                        }
                    ]
                    case 280: return [
                        {
                            chainId: "0x118",
                            rpcUrls: [env.rpc(280)],
                            chainName: 'zkTestnet',
                            nativeCurrency: {
                                name: 'zkSync Testnet Native Token',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(280)]
                        }
                    ]
                    case 324: return [
                        {
                            chainId: "0x144",
                            rpcUrls: [env.rpc(324)],
                            chainName: 'zkSync',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(324)]
                        }
                    ]
                    case 42161: return [
                        {
                            chainId: "0xA4B1",
                            rpcUrls: [env.rpc(42161) + '/'],
                            chainName: 'Arbitrum One',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(42161)]
                        }
                    ]
                    case 421613: return [
                        {
                            chainId: "0x66EED",
                            rpcUrls: [env.rpc(421613)],
                            chainName: 'Goerli Arbitrum Testnet',
                            nativeCurrency: {
                                name: 'Goerli Arbitrum Native Token',
                                symbol: 'AGOR',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(421613)]
                        }
                    ]
                    default: return [
                        {
                            chainId: "0x45c",
                            rpcUrls: [env.rpc(1116)],
                            chainName: 'Core Blockchain',
                            nativeCurrency: {
                                name: 'CORE',
                                symbol: 'CORE',
                                decimals: 18
                            },
                            blockExplorerUrls: [env.ETHERSCAN(1116)]
                        }
                    ]
                }
            }
            return await provider.request({
                method: 'wallet_addEthereumChain',
                params: getParams(chainId)
            }).catch(e => {
                console.log(e)
                console.log('Could not setup network')
                return false
            })
        })
    } else {
        console.error("Can't setup the network on metamask because window.ethereum is undefined")
        return false
    }
}
export const getContract = (address, abi, provider) => {
    return new Contract(address, abi, !provider ? getProvider(true) : provider.getSigner().connectUnchecked())
}

export const waitForTransaction = async (contract, tx, eventName, isMany, library) => {
    if (!tx) throw new Error('No transaction request')
    if (!library) library = getProvider()
    return getTransactionResult(library, tx, contract, eventName, isMany)
}
export const multicall = async (contractAddress, abi, method, data = []) => {
    const multicallContract = new Contract(env.MULTICALL(), multicallABI, getProvider(true))
    const callContract = new Contract(contractAddress, abi, getProvider(true))
    const contractInterface = callContract.interface
    const fragment = contractInterface.getFunction(method)
    const callData = data.map(d => ({ target: contractAddress, callData: contractInterface.encodeFunctionData(fragment, d) }))
    let results = []
    let callGroups = []
    let groupSize = 50
    for (let i = 0; i < callData.length; i += groupSize) callGroups.push(callData.slice(i, i + groupSize))
    for (let i = 0; i < callGroups.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        await multicallContract.functions.aggregate(callGroups[i]).then(([block, result]) => {
            const parsedResults = callGroups[i].length > 0 && result instanceof Array ? result.map((u, i) => ((callResult, contractInterface, fragment) => {  // eslint-disable-line @typescript-eslint/no-unused-vars
                if (!callResult) return null
                let result
                try {
                    result = contractInterface.decodeFunctionResult(fragment, callResult)
                } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
                    // console.error('Error decoding multicall result:', fragment, i, e)
                    return null
                }
                return result
            })(u, contractInterface, fragment.name)) : [((callResult, contractInterface, fragment) => {
                if (!callResult) return null
                let result
                try {
                    result = contractInterface.decodeFunctionResult(fragment, callResult)
                } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
                    // console.error('Error decoding multicall result:', fragment, e)
                    return null
                }
                return result
            })(result, contractInterface, fragment.name)] ?? []
            results.push(...parsedResults)
        })
    }
    return results
}
const isMethodArg = (x) => ['string', 'number'].indexOf(typeof x) !== -1
export const multicontract = async (addresses, abi, methodName, callInputs) => {
    const provider = getProvider(true)
    const multicallContract = new Contract(env.MULTICALL(), multicallABI, provider)
    const callContract = new Contract(addresses[0], abi, provider)
    const contractInterface = callContract.interface
    const fragment = contractInterface.getFunction(methodName)
    const callData = fragment && (callInputs === undefined || (Array.isArray(callInputs) && callInputs.every((xi) => isMethodArg(xi) || (Array.isArray(xi) && xi.every(isMethodArg))))) ? contractInterface.encodeFunctionData(fragment, callInputs) : undefined
    const calls = fragment && addresses && addresses.length > 0 && callData ? addresses.map((address) => {
        return address && callData ? { target: address, callData } : undefined
    }) : []
    let results = []
    let callGroups = []
    let groupSize = 50
    for (let i = 0; i < calls.length; i += groupSize) callGroups.push(calls.slice(i, i + groupSize))
    for (let i = 0; i < callGroups.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        await multicallContract.functions.aggregate(callGroups[i]).then(([block, result]) => {
            const parsedResults = result instanceof Array ? result.map((u, i) => ((callResult, contractInterface, fragment) => { // eslint-disable-line @typescript-eslint/no-unused-vars
                if (!callResult) return null
                let result
                try {
                    result = contractInterface.decodeFunctionResult(fragment, callResult)
                } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
                    // console.log('Error decoding multicall result:', fragment, i, e)
                    return null
                }
                return result
            })(u, contractInterface, fragment.name)) : ((callResult, contractInterface, fragment) => {
                if (!callResult) return null
                let result
                try {
                    result = contractInterface.decodeFunctionResult(fragment, callResult)
                } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
                    // console.log('Error decoding multicall result:', fragment, e)
                    return null
                }
                return [result]
            })(result, contractInterface, fragment.name) ?? []
            results.push(...parsedResults)
        })
    }
    return results
}

export const multicallContracts = async (addresses, abis, methodNames, callInputs) => {
    const provider = getProvider(true)
    const multicallContract = new Contract(env.MULTICALL(), multicallABI, provider)
    const interfaces = []
    const fragments = []
    const calls = addresses && addresses.length > 0 ? addresses.map((address, i) => {
        const methodName = methodNames[i]
        const abi = abis instanceof Array ? abis[i] : abis[methodName]
        const contractInterface = new Contract(addresses[i], abi, provider).interface
        interfaces.push(contractInterface)
        const fragment = contractInterface.getFunction(methodName)
        fragments.push(fragment)
        const callData = fragment && (callInputs[i] === undefined || (Array.isArray(callInputs[i]) && callInputs[i].every((xi) => isMethodArg(xi) || (Array.isArray(xi) && xi.every(isMethodArg))))) ? contractInterface.encodeFunctionData(fragment, callInputs[i]) : undefined
        return { target: address, callData }
    }) : []
    let results = []
    let callGroups = []
    let groupSize = 50
    for (let i = 0; i < calls.length; i += groupSize) callGroups.push(calls.slice(i, i + groupSize))
    for (let i = 0; i < callGroups.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        await multicallContract.functions.aggregate(callGroups[i]).then(([block, result]) => {
            const parsedResults = result instanceof Array ? result.map((u, z) => ((callResult, contractInterface, fragment) => {
                if (!callResult) return null
                let result
                try {
                    result = contractInterface.decodeFunctionResult(fragment, callResult)
                } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
                    /*                     console.log('Error decoding multicall result:', fragment, z+groupSize*i, e) */
                    return null
                }
                return result
            })(u, interfaces[z + groupSize * i], fragments[z + groupSize * i].name)) : ((callResult, contractInterface, fragment) => {
                if (!callResult) return null
                let result
                try {
                    result = contractInterface.decodeFunctionResult(fragment, callResult)
                } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
                    /*                     console.log('Error decoding multicall result:', fragment, e) */
                    return null
                }
                return result
            })(result, interfaces[0], fragments[0].name) ?? []
            results.push(...parsedResults)
        })
    }
    return results
}
export const getTransactionResult = (library, transactionRequest, contract, eventName, isMany) => {
    return new Promise((res, rej) => {
        if (!library) return rej('No library')
        if (!transactionRequest) return rej('No transaction request')
        if (!contract && eventName) return rej('No contract')
        let { hash } = transactionRequest
        if (!hash) return rej('No transaction hash')
        const getTransactionResult = (txReceipt) => {
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
        library.waitForTransaction(hash, 1, 1000 * 60 * 60 * 20).then(receipt => {
            if (!receipt) return rej('Unable to confirm transaction')
            try {
                res(getTransactionResult(receipt, contract, eventName, isMany))
            } catch (e) {
                return rej(e)
            }
        }).catch(rej)
    })
}
async function lookupNNSOrENS(library, address) {
    try {
        const res = await library.call({
            to: env.ENS_CONTRACT(),
            data: env.ENS_PREFIX() + address.substring(2),
        });
        const offset = EthersBN.from(utils.hexDataSlice(res, 0, 32)).toNumber();
        const length = EthersBN.from(utils.hexDataSlice(res, offset, offset + 32)).toNumber();
        const data = utils.hexDataSlice(res, offset + 32, offset + 32 + length);
        return utils.toUtf8String(data) || null;
    } catch (e) {
        return null;
    }
}
const ENS_DB = new DB('ens-lookups')
const ensData = makeModel(ENS_DB, 'ENS', a => a, {
    address: 'string',
    name: 'string',
    expires: 'number'
})
export const lookupENS = (address) => new ensData().find({ address }).then(async (ensResult) => {
    if (ensResult) {
        if (ensResult.expires > Date.now()) {
            return ensResult.name
        } else {
            await new ensData().delete(ensResult._id).catch(e => console.log(e))
            ensResult = null;
        }
    }
    return lookupNNSOrENS(getProvider(true), address).then(name => {
        if (!name) return address
        return new ensData({
            address,
            name,
            expires: Date.now() + 1000 * 60 * 30
        }).save().then(({ name }) => name)
    })
})

export const shortenAddress = (address) => {
    if (!address) return ''
    return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
}

export const fromBigNumber = (big, decimals = 18, maxDecimals) => {
    if (typeof maxDecimals !== 'number') maxDecimals = Math.max(1, decimals)
    let r = new BigNumber(big || 0).dividedBy(10 ** decimals)
    if (r.isNaN()) return '0'
    if (r.isLessThanOrEqualTo(new BigNumber(0))) return '0'
    if (maxDecimals && r.isLessThan(new BigNumber(`0.${Array(maxDecimals - 1).fill('0').join('')}1`))) return `0.${Array(maxDecimals - 1).fill('0').join('')}1`
    return parseFloat(r.toFixed(maxDecimals)).toLocaleString(undefined, { maximumFractionDigits: maxDecimals })
}
export const intoBigNumber = (big, decimals = 18) => {
    let r = new BigNumber((typeof big === 'string' ? big.replace(/(\$|,)/g, '') : big) || 0).multipliedBy(10 ** decimals)
    if (r.isNaN()) return '0'
    return r.absoluteValue().toString()
}