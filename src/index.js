import React from 'react'
  import { createRoot } from 'react-dom/client'
  import App from './app'
  import Provider from './web3-hooks'
  import { BrowserRouter } from 'react-router-dom'
  
  createRoot(document.querySelector('main')).render(<React.StrictMode>
      <Provider>
          <BrowserRouter>
              <App />
          </BrowserRouter>
      </Provider>
  </React.StrictMode>)