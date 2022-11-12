import React from 'react'
  import { useAppContext } from '../app.js';
  
  
  
  export default function ConnectWalletButton(props) {
      const {setState, account, logout} = useAppContext()
      if (account) return (<button {...props} onClick={logout}>{props.children || 'Disconnect'}</button>)
      return (<button {...props} onClick={() => setState('showWalletConnect')}>
          {props.children || 'Connect Wallet'}
      </button>);
  }