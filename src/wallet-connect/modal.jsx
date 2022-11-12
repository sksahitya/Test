import React from 'react'
  import './wallet-connect.css'
  export default function Modal({ children, dismiss = e => e?.currentTarget?.remove() }) {
      return (<div className="modal-wallet" onClick={e => {
          if (e.target.isSameNode(e.currentTarget)) {
              if (typeof dismiss === 'function') dismiss()
          }
      }}>
          <div className="modal-container-wallet" onClick={e => {
              e.stopPropagation()
              if (e.target.isSameNode(e.currentTarget)) {
                  if (typeof dismiss === 'function') dismiss()
              }
          }}>
              {children}
          </div>
      </div>)
  }