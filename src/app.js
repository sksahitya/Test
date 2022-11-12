import React, { useReducer, createContext, useState } from 'react'
  import env from './env'
  import './index.css'
  import WalletModal from './wallet-connect/wallet-modal'
  import { useAuth, useEagerConnect, useEthPrice, useInactiveListener } from './web3-hooks'
  import { useWeb3React } from '@web3-react/core'
  import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom'
  const { api } = env
  const request = (path, method = 'GET', data, headers) => {
      return new Promise((res, rej) => {
          const options = { method }
          if (data) {
              options.body = JSON.stringify(data);
              options.headers = {}
              options.headers['Content-Type'] = 'application/json'
          }
          if (headers) {
              if (!options.headers) options.headers = {}
              options.headers = { ...options.headers, ...headers }
          }
          fetch(`${api}${path}`, options).then(result => result.json()).then(result => {
              if (!result || result.error) return rej(result?.message || JSON.stringify(result))
              res(result)
          }).catch(e => rej(e))
      })
  }
  const initialState = {
      showWalletConnect: false
  }
  const changeState = (state, change) => {
      if (typeof change === 'function') return change(state)
      if (typeof change === 'string') {
          switch (change) {
              case 'showWalletConnect': return { ...state, showWalletConnect: true }
              case 'hideWalletConnect': return { ...state, showWalletConnect: false }
              default: return state
          }
      }
      if (typeof change === 'object') {
          return { ...state, ...change }
      }
      return state
  }
  export const AppContext = createContext();
  export const useAppContext = () => React.useContext(AppContext);
  function NotFound() {
      return (<div className="w100 padded-column" style={{ height: '100%' }}><h1>404 Not Found</h1></div>)
  }
  export default function App() {
      const { account, library, chainId } = useWeb3React()
      const { login, logout } = useAuth()
      const [state, setState] = useReducer(changeState, initialState)
      const { price: ethPrice, refresh: refreshEthPrice } = useEthPrice()
      const location = useLocation()
      const queries = location?.search?.split('?')?.[1]?.split('&').reduce((a, b) => {
          let c = b.split('=')
          return { ...a, [c[0]]: c[1] }
      }, {}) || {}
      const pathname = location?.pathname
      const redirect = useNavigate()
      useEagerConnect()
      useInactiveListener()
      return (<AppContext.Provider value={{ state, setState, login, logout, ethPrice, refreshEthPrice, account, web3: library, queries, pathname, redirect, request }}>
          <div className="app">
              {window.ethereum && account && ![1, 5].includes(Number(chainId)) && <div id="invalid-chain">
                  <h1>Wrong Network Detected</h1>
                  <span>Metatopia games require you to switch over to Ethereum Mainnet to be able to participate.</span>
                  <span>To get started, please switch your network by following the instructions below:</span>
                  <span>Open Metamask</span>
                  <span>Click the network select dropdown</span>
                  <span>Click on "Ethereum Mainnet"</span>
              </div>}
              <div className="page-content">
                  <NavBar />
                  <div className="app-content">
                      <Routes>
                          <Route exact path="/" element={<>
                              <h1>Home</h1>
                            </>} />
                          <Route path="*" element={<NotFound />} />
                      </Routes>
                      <Footer />
                  </div>
              </div>
              {state.showWalletConnect && <WalletModal login={login} onDismiss={() => {
                  setState('hideWalletConnect')
              }} />}
          </div>
      </AppContext.Provider>)
  }