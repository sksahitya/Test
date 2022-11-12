import React, { useState, useEffect, useRef, useMemo } from 'react'
  import React, { useCallback, useEffect, useMemo } from 'react'
  import { ethers, Contract } from 'ethers'
  import { useWeb3React, Web3ReactProvider, UnsupportedChainIdError } from '@web3-react/core'
  import { InjectedConnector, NoEthereumProviderError, UserRejectedRequestError as UserRejectedRequestErrorInjected, } from '@web3-react/injected-connector'
  import { WalletConnectConnector, UserRejectedRequestError as UserRejectedRequestErrorWalletConnect, } from '@web3-react/walletconnect-connector'
  import { BscConnector, NoBscProviderError } from '@binance-chain/bsc-connector'
  import BigNumber from 'bignumber.js'
  import multicallABI from './abis/Multicall.json'
  import env from './env'
  
  const { api, testnet } = env
  BigNumber.config({ EXPONENTIAL_AT: [-100, 100] })
  const simpleRpcProvider = new ethers.providers.StaticJsonRpcProvider(testnet ? 'https://goerli.infura.io/v3/d4337d50c021436ab642bf037a24415a' : 'https://mainnet.infura.io/v3/d4337d50c021436ab642bf037a24415a')
  const connectorLocalStorageKey = 'connector_name'
  const POLLING_INTERVAL = 12000
  const connectors = {
    "injected": new InjectedConnector({ supportedChainIds: [1, 4, 5] }),
    "walletconnect": new WalletConnectConnector({
      rpc: { 1: 'https://mainnet.infura.io/v3/d4337d50c021436ab642bf037a24415a', 4: 'https://rinkeby.infura.io/v3/d4337d50c021436ab642bf037a24415a', 5: 'https://goerli.infura.io/v3/d4337d50c021436ab642bf037a24415a' },
      qrcode: true,
      pollingInterval: POLLING_INTERVAL,
    }),
    "bsc": new BscConnector({ supportedChainIds: [1, 4, 5, 56, 97] })
  }
  const MULTICALL = testnet ? '0x77dCa2C955b15e9dE4dbBCf1246B4B85b651e50e' : '0xb0A452DcB9c7cC99bA6a16A0583b8e18e9D3A4c1'
  export const toTopia = (big, maxDecimals = 3) => {
    let r = new BigNumber(big || 0).dividedBy(10 ** 18)
    if (r.isNaN()) return '0'
    if (r.isLessThanOrEqualTo(new BigNumber(0))) return `0`
    if (r.isLessThan(new BigNumber(`0.${Array(maxDecimals - 1).fill('0').join('')}1`))) return `0.${Array(maxDecimals - 1).fill('0').join('')}1`
    return parseFloat(r.toFixed(maxDecimals)).toLocaleString()
  }
  const { injected } = connectors
  const getLibrary = (provider) => {
    const library = new ethers.providers.Web3Provider(provider)
    library.pollingInterval = POLLING_INTERVAL
    return library
  }
  export const BigNumberFormat = {
    prefix: '',
    decimalSeparator: '.',
    groupSeparator: '',
    groupSize: 3,
    secondaryGroupSize: 0,
    fractionGroupSeparator: '',
    fractionGroupSize: 0,
    suffix: ''
  
  }
  export const getContract = (address, abi, library) => {
    const contract = new Contract(address, abi, library)
    return contract
  }
  export const useContract = (address, abi, requireAccount) => {
    const { library, account } = useWeb3React()
    const [contract, setContract] = useState(null)
    useEffect(() => {
      if (address && abi && (requireAccount ? account : true)) {
        setContract(getContract(address, abi, account ? library?.getSigner(account).connectUnchecked() : simpleRpcProvider))
      } else {
        setContract(null)
      }
    }, [address, abi, account])
    return contract
  }
  export const useEventManager = (contract) => {
    const manageListeners = useRef([]) // stores {event, callback, time, timeout, onTimeout, address, token}
    const ContractEvent = useCallback((name, identify = (result, event) => true) => ({
      /* 
      Returns an event handler
      when the event happens it passes the events arguments to the identify function
      for each of the listeners in manageListeners and if the result is truthy it will fire that event's
      callback with the arguments
    */
      event: name,
      callback: function () {
        let eventIndex = manageListeners.current.findIndex(event => identify(arguments, event))
        if (eventIndex > -1) {
          let event = manageListeners.current.splice(eventIndex, 1)[0]
          if (typeof event.callback === 'function') event.callback(arguments)
        }
      }
    }), [])
    const [contractEvents, setContractEvents] = useState([]) // stores the list of ContractEvent() that the contract will listen for
    /* Adds an listener for an event with optional timeout */
    const addEvent = useCallback((event = {
      event: 'ClaimRewardsbyAddr',
      address: '0x0000',
      callback: (args = []) => { },
      time: new Date().getTime(),
      timeout: 60000,
      onTimeout: () => { }
    }) => manageListeners.current.push(event), [])
    const watchContractEvent = useCallback((event) => setContractEvents(e => [...e, event]), [])
    const unwatchContractEvent = useCallback((event) => {
      /* 
      Removes an event from the contractEvents array and removes the event from the contract
      if the contract is ready
    */
      setContractEvents(e => e.filter(e => e.event !== event))
    }, [setContractEvents])
    useEffect(() => {
      /* Adds listeners to the contract for each {event, callback} */
      if (contract) {
        contract.removeAllListeners()
        contractEvents.forEach(({ event, callback }) => contract.on(event, callback))
      } else if (manageListeners.current.length > 0) {
        manageListeners.current = []
      }
      return () => {
        if (contract) contract.removeAllListeners()
      }
    }, [contract, contractEvents])
    useEffect(() => {
      /* Handles the timeouts of different listeners */
      let interval = setInterval(() => {
        let length = manageListeners.current.length
        if (length > 0) {
          for (let i = 0; i < length; i++) {
            let event = manageListeners.current[i]
            if (event.time && event.timeout) {
              if (event.time + event.timeout < new Date().getTime()) {
                let event = manageListeners.current.splice(i, 1)[0]
                if (typeof event.onTimeout === 'function') event.onTimeout()
                i--
                length--
              }
            }
          }
        }
      }, 100)
      return () => {
        clearInterval(interval)
      }
    }, [])
    return { addEvent, watchContractEvent, unwatchContractEvent, ContractEvent }
  }
  const bigz = new BigNumber(0)
  export const useEthPrice = () => {
    const [price, setPrice] = useState(0)
    const [loadingPrice, setLoadingPrice] = useState(false)
    const [refreshCount, setRefreshCount] = useState(0)
    useEffect(() => {
      if (!loadingPrice) {
        setLoadingPrice(true)
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`)
          .then(r => r.json())
          .then(({ ethereum }) => {
            setPrice(ethereum.usd)
          })
          .catch(e => {
            console.error(e)
            setPrice(0)
          })
          .finally(() => setLoadingPrice(false))
      }
    }, [refreshCount])
    return { price, refresh: () => setRefreshCount(r => r + 1), loading: loadingPrice }
  }
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
  const useWaitForResponse = (contract) => {
    const { library } = useWeb3React()
    return useCallback((transactionRequest, eventName, isMany = false) => {
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
    }, [library, contract])
  }
  const useApproval = (address, abi) => {
    const contract = useContract(address, abi, false)
    const { account } = useWeb3React()
    const waitForResponse = useWaitForResponse(contract)
    const approve = useCallback((game) => {
      return new Promise((res, rej) => {
        if (!game) return rej('Invalid game')
        if (!account) return rej('You must be logged in')
        contract.setApprovalForAll(game, true).then(transaction => waitForResponse(transaction)).then(() => {
          res()
        }).catch(e => {
          rej(e)
        })
      })
    }, [account, contract])
    const hasApproved = useCallback((game) => {
      return new Promise(async (res, rej) => {
        if (!game) return rej('Invalid game')
        if (!account || !contract) return res(false)
        await contract.isApprovedForAll(account, game).then((isApproved) => {
          res(isApproved)
        }).catch(e => {
          rej(e)
        })
      })
    }, [contract, account])
    return { approve, hasApproved, contract }
  }
  const useTokenApproval = (address, abi) => {
    const contract = useContract(address, abi, false)
    const { account } = useWeb3React()
    const waitForResponse = useWaitForResponse(contract)
    const approve = useCallback((token) => {
      return new Promise((res, rej) => {
        if (!token) return rej('Invalid token')
        if (!account) return rej('You must be logged in')
        contract.approve(token, ethers.constants.MaxUint256).then(transaction => waitForResponse(transaction)).then(() => {
          res()
        }).catch(e => {
          rej(e)
        })
      })
    }, [account, contract])
    const hasApproved = useCallback((token) => {
      return new Promise(async (res, rej) => {
        if (!token) return rej('Invalid token')
        if (!account) return res(false)
        if (!contract) return res(false)
        await contract.allowance(account, token).then((isApproved) => {
          res(new BigNumber(isApproved.toString()).isGreaterThan(0))
        }).catch(e => {
          rej(e)
        })
      })
    }, [contract, account])
    return { approve, hasApproved, contract }
  }
  const setupNetwork = async () => {
    const provider = window.ethereum
    if (provider) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${1}`,
              rpcUrls: ['https://mainnet.infura.io/v3/d4337d50c021436ab642bf037a24415a']
            },
            {
              chainId: `0x${5}`,
              rpcUrls: ['https://goerli.infura.io/v3/d4337d50c021436ab642bf037a24415a']
            },
          ],
        })
        return true
      } catch (error) {
        console.error('Failed to setup the network in Metamask:', error)
        return false
      }
    } else {
      console.error("Can't setup the BSC network on metamask because window.ethereum is undefined")
      return false
    }
  }
  export const useAuth = () => {
    const { chainId, activate, deactivate } = useWeb3React()
    const login = useCallback(
      (connectorID) => {
        const connector = connectors[connectorID]
        localStorage.setItem(connectorLocalStorageKey, connectorID)
        if (connector) {
          activate(connector, async (error) => {
            if (error instanceof UnsupportedChainIdError) {
              const hasSetup = await setupNetwork()
              if (hasSetup) {
                activate(connector)
              }
              alert('Please switch to the Ethereum main network')
            } else {
              if (error instanceof NoEthereumProviderError || error instanceof NoBscProviderError) {
                alert('No provider was found')
              } else if (
                error instanceof UserRejectedRequestErrorInjected ||
                error instanceof UserRejectedRequestErrorWalletConnect
              ) {
                if (connector instanceof WalletConnectConnector) {
                  const walletConnector = connector
                  walletConnector.walletConnectProvider = null
                }
                alert('User rejected request')
              } else {
                console.error('Unhandled error during login', error)
                alert('Unhandled error during login')
              }
            }
          })
        } else {
          alert('Unable to find connector')
        }
      },
      [activate],
    )
    const logout = useCallback(() => {
      localStorage.removeItem(connectorLocalStorageKey)
      deactivate()
      // This localStorage key is set by @web3-react/walletconnect-connector
      if (window.localStorage.getItem('walletconnect')) {
        connectors.walletconnect.close()
        connectors.walletconnect.walletConnectProvider = null
      }
      if (chainId) {
  
      }
    }, [deactivate, chainId])
    return { login, logout }
  }
  export function useEagerConnect() {
    const { activate, active } = useWeb3React()
    const [tried, setTried] = useState(false)
    useMemo(() => {
      if (localStorage.getItem(connectorLocalStorageKey) !== null && localStorage.getItem(connectorLocalStorageKey) !== 'undefined' && injected && typeof injected.isAuthorized === 'function') injected.isAuthorized().then((isAuthorized) => {
        if (isAuthorized) {
          activate(injected, undefined, true).catch(() => {
            setTried(true)
          })
        } else {
          setTried(true)
        }
      })
    }, []) // intentionally only running on mount (make sure it's only mounted once :))
  
    // if the connection worked, wait until we get confirmation of that to flip the flag
    useEffect(() => {
      if (!tried && active) {
        setTried(true)
      }
    }, [tried, active])
    return tried
  }
  export function useInactiveListener(suppress = false) {
    const { active, chainId, error, activate } = useWeb3React()
    useEffect(() => {
      const { ethereum } = window
      if (ethereum && ethereum.on && !active && !error) {
        const handleConnect = () => {
          if (!suppress) console.log("Handling 'connect' event")
          if (chainId !== 1) {
            /* Notify end user that they need to switch networks */
          }
          activate(injected)
        }
        const handleChainChanged = (chainId) => {
          if (!suppress) console.log("Handling 'chainChanged' event with payload", chainId)
          activate(injected)
        }
        const handleAccountsChanged = (accounts) => {
          if (!suppress) console.log("Handling 'accountsChanged' event with payload", accounts)
          if (accounts.length > 0) {
            activate(injected)
          }
        }
        ethereum.on('connect', handleConnect)
        ethereum.on('chainChanged', handleChainChanged)
        ethereum.on('accountsChanged', handleAccountsChanged)
        return () => {
          if (ethereum.removeListener) {
            ethereum.removeListener('connect', handleConnect)
            ethereum.removeListener('chainChanged', handleChainChanged)
            ethereum.removeListener('accountsChanged', handleAccountsChanged)
          }
        }
      }
    }, [active, error, suppress, activate])
  }
  export default function Provider({ children }) {
    return (<Web3ReactProvider getLibrary={getLibrary}>{children}</Web3ReactProvider>)
  }