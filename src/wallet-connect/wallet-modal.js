import Modal from './modal'
  import config, { walletLocalStorageKey, connectorLocalStorageKey } from "./config";
  import React, { useState } from 'react';
  import IconFix from './icon';
  import DarkSymbols from './darkmode-symbols'
  
  
  const ConnectorNames = {
      Injected: 'injected',
      WalletConnect: 'walletconnect',
      BSC: 'bsc'
  }
  const { ellipses } = DarkSymbols
  const getPreferredConfig = (walletConfig) => {
      const preferredWalletName = localStorage.getItem(walletLocalStorageKey);
      const sortedConfig = walletConfig.sort((a, b) => a.priority - b.priority);
  
      if (!preferredWalletName) {
          return sortedConfig;
      }
  
      const preferredWallet = sortedConfig.find((sortedWalletConfig) => sortedWalletConfig.title === preferredWalletName);
  
      if (!preferredWallet) {
          return sortedConfig;
      }
  
      return [
          preferredWallet,
          ...sortedConfig.filter((sortedWalletConfig) => sortedWalletConfig.title !== preferredWalletName),
      ];
  };
  const WalletCard = ({ walletConfig, login, onDismiss }) => {
      return (<div onClick={() => {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
          // Since iOS does not support Trust Wallet we fall back to WalletConnect
          if (walletConfig.title === "Trust Wallet" && isIOS) {
              login(ConnectorNames.WalletConnect);
          } else {
              login(walletConfig.connectorId);
          }
  
          localStorage.setItem(walletLocalStorageKey, walletConfig.title);
          localStorage.setItem(connectorLocalStorageKey, walletConfig.connectorId);
          onDismiss();
      }} className="wallet-card">
          <IconFix svg={walletConfig.icon}></IconFix>
          <span>{walletConfig.title}</span>
      </div>)
  }
  export default function WalletModal({ login, onDismiss }) {
      const displayCount = 3
      const [showMore, toggleShowMore] = useState(false)
      const sortedConfig = getPreferredConfig(config);
      const displayListConfig = showMore ? sortedConfig : sortedConfig.slice(0, displayCount);
      return (<Modal dismiss={onDismiss}>
          <div id="wallet-connect">
              <div id="wallet-connect-header" className="padded-row jsb">
                  <h3>Connect Wallet</h3>
                  <span style={{ cursor: 'pointer' }} onClick={onDismiss}>X</span>
              </div>
              <div className="two-grid">
                  {displayListConfig.map((wallet, i) => (
                      <WalletCard key={i} walletConfig={wallet} login={login} onDismiss={onDismiss} />
                  ))}
                  {!showMore && (<div className="wallet-card" onClick={() => toggleShowMore(!showMore)} >
                      <IconFix svg={ellipses} />
                      <span>More</span>
                  </div>)}
              </div>
              <div id="learn-to-connect" className="padded-column">
                  <span>Haven't got a crypto wallet yet?</span>
                  <button className="launch-option">Learn How to Connect</button>
              </div>
          </div>
      </Modal>)
  }