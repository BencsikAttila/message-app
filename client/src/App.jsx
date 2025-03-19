import React from 'react'
import { Route, Switch } from 'react-router-dom'
import Home from './pages/Home'
import What from './pages/What'

export default function() {
  return (
    <div>
      <Switch>
        <Route exact path='/' component={Home}/>
        <Route exact path='/what' component={What}/>
      </Switch>
    </div>
  )
}
