import State from "@ideadesignmedia/swag";

export const location = new State(window.location.pathname)
window.addEventListener('popstate',() => location.value = window.location.pathname)
export const navigate = (path) => {window.history.pushState({},"",path); location.value = window.location.pathname}
export default location