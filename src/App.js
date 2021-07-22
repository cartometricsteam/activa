import React, { useEffect } from 'react'
import ReactGA from 'react-ga'
import { NotificationContainer } from 'react-notifications'
import { Steps } from 'intro.js-react'
import { connect } from 'react-redux'
import { Router } from "@reach/router"
// OPTIMIZE IMPORTS
import firebase from 'firebase'
import * as turf from '@turf/turf'
import { assocPath, pipe } from 'ramda'

import { store, setActivities, setUser, setEvents, setFetching, setShowSteps, setNewData } from './redux/store'
import Map from './Components/Map/Map'
import Header from './Components/Header/Header'
import Dashboard from './Components/User/User'
import Help from './Components/Help/Help'
import ActivitySidebar from './Components/Sidebar/Activity'
import Districts from './Components/Filters/Districts'
import Activities from './Components/Filters/Activities'
import SportForm from './Components/Forms/Activity'
import EventForm from './Components/Forms/Event'
import EventSidebar from './Components/Sidebar/Event'

ReactGA.initialize(process.env.REACT_APP_GA_ID)
ReactGA.pageview(window.location.pathname + window.location.search)

firebase.initializeApp({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
})

const mapStateToProps = state => ({
  activities: state.activities,
  events: state.events,
  fetching: state.fetching,
  steps: state.steps_visibility
})

const App = props => {

  const initialStep = 0,
    steps = [
      {
        element: '.navbar.is-fixed-top',
        intro: 'Bienvenido a Activa Málaga. En esta barra podrás seleccionar los filtros de actividad deportiva y distrito, así como iniciar sesión o registrarte.',
      },
      {
        element: '.mapbox-gl-draw_point',
        intro: 'Con este botón podrás registrar los puntos de interés donde realizas la actividad deportiva.',
      },
      {
        element: '.mapbox-gl-draw_line',
        intro: 'Si tu actividad deportiva implica un recorrido podrás crearlo mediante una sucesión de puntos. Haz doble click, o pulsa dos veces, para terminar de dibujar el recorrido.',
      },
      {
        element: '.mapbox-gl-draw_trash',
        intro: 'Utiliza este botón para eliminar un punto o recorrido que estés creando.',
      },
      {
        element: '.icon.legend',
        intro: 'Pulsando este botón podrás visualizar una leyenda que relaciona los iconos representados en el mapa con cada actividad deportiva.',
      }
    ]

  const stepsOnExit = () => {

    store.dispatch(setShowSteps(false))
  }

  useEffect(() => {
    firebase.auth().onAuthStateChanged(async user => {
      if (user) {
        const lastConnection = user.photoURL
        store.dispatch(setUser({ displayName: user.displayName, email: user.email, uid: user.uid, lastConnection: lastConnection }))
        await user.updateProfile({
          photoURL: new Date().toISOString()
        })
      } else {
        store.dispatch(setUser(null))
      }
    });
  }, [])

  useEffect(() => {
    const fetch = () => {
      firebase.firestore().collection('sports').onSnapshot(async querySnapshot => {
        const snapshot = querySnapshot

        const features = snapshot.docs.map(doc => {
          const data = doc.data()
          const id = doc.id

          const addId = assocPath(['properties', 'id'], id)
          const addFalseLineProperty = assocPath(['properties', 'pointInLine'], false)

          let object
          if (turf.getType(data) === 'LineString') {
            object = assocPath(['geometry', 'coordinates'], Object.values(data.geometry.coordinates), data)
          }
          else object = data

          return pipe(addId, addFalseLineProperty)(object)

        })

        const exploded = features
          .filter(feature => turf.getType(feature) === 'LineString')
          .map(feature => turf.explode(feature).features)
          .flat()
          .map(assocPath(['properties', 'pointInLine'], true))

        const collection = turf.featureCollection([...features, ...exploded])

        store.dispatch(setActivities(collection))
        store.dispatch(setFetching(false))
        store.dispatch(setNewData())
      })

      const date = new Date();
      date.setDate(date.getDate() - 14);
      const twoWeeksAgo = date.toISOString();

      firebase.firestore().collection('events')
        .where('properties.date', '>', twoWeeksAgo)
        .onSnapshot(async querySnapshot => {
          const snapshot = querySnapshot

          const features = snapshot.docs.map(doc => {
            let data = doc.data()
            return assocPath(['properties', 'id'], doc.id, data)
          })

          const collection = turf.featureCollection(features)

          store.dispatch(setEvents(collection))
          store.dispatch(setFetching(false))
          store.dispatch(setNewData())
        })

    }
    fetch()
  }, [])


  return (
    <Map>
      <Header />
      <NotificationContainer />
      <Router>
        <Dashboard path='/user' />
        <Districts path='/districts' />
        <Activities path='/sports' />
        <ActivitySidebar path='/activities/:id' />
        <EventSidebar path='/events/:id' />
        <SportForm path='/activities/:id/edit' />
        <EventForm path='/events/:id/edit' />
        <Help path='/help' />
      </Router>
      <Steps
        enabled={props.steps}
        steps={steps}
        initialStep={initialStep}
        onExit={stepsOnExit}
        options={{
          nextLabel: 'Siguiente',
          prevLabel: 'Anterior',
          skipLabel: 'Saltar',
          doneLabel: 'Hecho'
        }}
      />
    </Map>
  )
}

export default connect(
  mapStateToProps,
  null
)(App)