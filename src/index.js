import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-notifications/lib/notifications.css';
import 'intro.js/introjs.css';
import 'animate.css';
import './i18n'
import App from './App';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.register();
