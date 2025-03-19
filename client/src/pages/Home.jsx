import React from 'react'
import { Link } from 'react-router-dom'

export default function () {
  return (
  <div className="App">
    <h1>Project Home</h1>
    <Link to={'./what'}>
      <button variant="raised">
          What
      </button>
    </Link>
  </div>
  )
}
