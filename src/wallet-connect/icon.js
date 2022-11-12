import React from 'react'
  export default function IconFix(props) {
    let { svg, link, comingSoon } = props
    if (link) return (<a className="icon-link" href={link} rel="noreferrer" target="_blank"><div className={"svg-container " + (props.reverse ? 'flip-backwards': '')}>{svg}</div></a>)
    if (comingSoon) return (<a className="icon-link comingSoon" href={link} rel="noreferrer" target="_blank"><div className={"svg-container " + (props.reverse ? 'flip-backwards': '')}>{svg}</div></a>)
    return (<div className={"svg-container " + (props.reverse ? 'flip-backwards': '')} onClick={props.onClick}> {svg}</div >)
  }