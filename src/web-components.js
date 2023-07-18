import { State, ControlledComponent } from "@ideadesignmedia/swag";
import { navigate } from "./router";
class PageNotFound extends HTMLElement {
    render() {
        this.innerHTML = `<div class="column w100 jfs gap">
            <h1>Page not found</h1>
            <button>Home</button>
        </div>`
        this.querySelector('button').addEventListener('click', () => {
            navigate('/')
        })
    }
    connectedCallback() {
        this.render()
    }
}
customElements.define('page-not-found', PageNotFound)

class App extends ControlledComponent {
    constructor() {
        super()
        this.shadow = this.attachShadow({ mode: 'open' })
        this.state = new State(0, this.update)
    }
    render() {
        this.shadow.innerHTML = `<style>
    </style>
    <div id="app">
        <h1>Page ${this.state.value}</h1>
        <div class="row gap">
            <button id="more">More</button>
            <button id="less">Less</button>
        </div>
    </div>`
        this.shadow.querySelector('#more').addEventListener('click', () => {
            this.state.value = this.state.value+1
        })
        this.shadow.querySelector('#less').addEventListener('click', () => {
            this.state.value = this.state.value-1
        })

    }
    connectedCallback() {
        this.render()
    }
}
customElements.define('app-component', App)