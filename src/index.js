import './index.css'
import useWeb3 from './web3'
import { location } from './router'
import './web-components'
export const { account, provider, chainId } = useWeb3()
document.querySelector('body').innerHTML = ''
const root = document.createElement('div')
root.id = 'root'
document.querySelector('body').appendChild(root)
const renderPage = (page) => root.innerHTML = (() => {
    switch (page) {
        case '/': return '<app-component></app-component>'
        default: `<page-not-found></page-not-found>`
    }
}
)();
renderPage(location.value)
location.on((page) => renderPage(page))