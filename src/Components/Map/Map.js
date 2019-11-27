import React, { useRef, useState, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { connect } from 'react-redux'
import { navigate, Link } from "@reach/router"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle, faLayerGroup } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import * as turf from '@turf/turf'

import { store, selectActivity } from '../../redux/store'
import sports from '../../assets/data/sports.json'
import Legend from './Components/Legend.js'

const reqSvgs = require.context('../../assets/icons', true, /\.png$/)
const sportsIcons = sports.list.map(sport => ({
    ...sport,
    icon: reqSvgs(`./${sport.key}.png`)
}))

const style = {
    map: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '100%'
    },
    tabs: {
        marginTop: '4.25rem',
        marginBottom: 0
    },
    tabsComponent: {
        zIndex: 1
    },
    tabsContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        margin: 'auto'
    }
},
    mapStyles = ['light', 'satellite'],
    mapModes = ['activities', 'events']

const mapStateToProps = state => ({
    activities: state.activities,
    events: state.events,
    districts: state.districts,
    filters_activities: state.filters_activities,
    filters_districts: state.filters_districts,
})

const loadLayers = (map, sources, mode, filters) => {
    sources.sportsIcons.forEach(icon => {
        map.loadImage(icon.icon, (error, image) => {
            if (error) throw error;
            map.addImage(icon.name, image)
        })
    })

    let layers = map.getStyle().layers,
        labelLayerId
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id
            break;
        }
    }

    map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
        }
    }, labelLayerId)

    map.addSource('activities', {
        type: 'geojson',
        data: sources.activities
    })

    map.addSource('districts', {
        type: 'geojson',
        data: sources.districts
    })

    map.addSource('events', {
        type: 'geojson',
        data: sources.events
    })

    map.addLayer({
        id: 'districts',
        source: 'districts',
        type: 'fill',
        'paint': {
            'fill-color': '#00aec7',
            'fill-opacity': 0.2
        },
        // filter: ['match', ['get', 'name'], ['none'], true, false]
        filter: filters.districts
    })

    map.addLayer({
        id: 'lineActivities',
        source: 'activities',
        type: 'line',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round',
            visibility: mode === 'events' ? 'none' : 'visible'
        },
        'paint': {
            'line-color': '#AAA',
            'line-width': 2
        },
        filter: filters.lineActivities ? filters.lineActivities : ['all']
    })

    map.addLayer({
        id: 'pointActivities',
        source: 'activities',
        type: 'symbol',
        "layout": {
            "icon-image": ['get', 'sport'],
            "icon-size": 0.75,
            "icon-allow-overlap": true,
            visibility: mode === 'events' ? 'none' : 'visible'
        },
        filter: filters.pointActivities
    })

    map.addLayer({
        id: 'pointInLineActivities',
        source: 'activities',
        type: 'symbol',
        "layout": {
            "icon-image": ['get', 'sport'],
            "icon-size": 0.75,
            "icon-allow-overlap": false,
            visibility: mode === 'events' ? 'none' : 'visible'
        },
        filter: filters.pointInLineActivities
    })

    map.addLayer({
        id: 'events',
        source: 'events',
        type: 'circle',
        layout: {
            visibility: mode === 'events' ? 'visible' : 'none'
        },
        paint: {
            'circle-radius': [
                "interpolate", ["linear"], ["zoom"],
                // zoom is 5 (or less) -> circle radius will be 1px
                5, 1,
                // zoom is 10 (or greater) -> circle radius will be 5px
                12, 4
            ],
            'circle-stroke-width': [
                "interpolate", ["linear"], ["zoom"],
                // zoom is 5 (or less) -> circle radius will be 1px
                5, 1,
                // zoom is 10 (or greater) -> circle radius will be 5px
                12, 6
            ],
            'circle-color': '#d75d00',
            'circle-stroke-color': '#d75d00'
        }
    })
},
    handleInteraction = (e, data, mode) => {

        let properties = e.features[0].properties,
            geometry,
            feature
        
            console.log(mode)
        if (properties.pointInLine) {
            geometry = data.features.find(feature => feature.properties.id === properties.id).geometry
            feature = turf.lineString(geometry.coordinates, properties)
        }
        else {
            geometry = e.features[0].geometry
            if (geometry.type === 'Point') {
                feature = turf.point(geometry.coordinates, properties)
            }
            else if (geometry.type === 'LineString') {
                feature = turf.lineString(geometry.coordinates, properties)
            }
        }

        navigate(`/${mode}/${feature.properties.id}`)
    },
    addInteractivity = (map, types, handler, data, mode) => {
        types.forEach(type => {
            map.on('mouseenter', type, () => {
                map.getCanvas().style.cursor = 'pointer'
            })

            map.on('mouseleave', type, () => {
                map.getCanvas().style.cursor = ''
            })

            map.on('click', type, e => handler(e, data, mode))

            map.on('touchend', type, e => handler(e, data, mode))
        })
    },
    initializeMap = ({ setMap, mapContainer, layers, mode, sources, filters }) => {
        mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN
        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: `mapbox://styles/mapbox/${mapStyles[layers]}-v9`,
            center: [-4.4214, 36.7213],
            zoom: 12,
            attributionControl: false
        }),
            attribution = new mapboxgl.AttributionControl({ customAttribution: ['Developed by <a href="https://cartometrics.com" target="_blank"><strong>Cartometrics</strong></a>'] }),
            navigation = new mapboxgl.NavigationControl(),
            draw = new MapboxDraw({
                controls: {
                    combine_features: false,
                    uncombine_features: false,
                    polygon: false
                }
            }),
            layerTypes = ['pointActivities', 'pointInLineActivities', 'lineActivities', 'events']

        map.on("load", () => {
            setMap(map)
            map.addControl(attribution, 'bottom-right')
            map.addControl(navigation, 'bottom-right')
            map.addControl(draw, 'bottom-right')

            loadLayers(map, {
                sportsIcons: sportsIcons,
                districts: sources.districts,
                activities: sources.activities,
                events: sources.events
            },
                mode,
                filters)

            addInteractivity(map, layerTypes, handleInteraction, sources.activities, mode)
        })

    }

const Map = props => {
    const [map, setMap] = useState(null),
        [legend, setLegend] = useState(false),
        [layers, setLayers] = useState(0),
        [mode, setMode] = useState(mapModes[0]),
        [filterLineActivity, setFilterLineActivity] = useState(null),
        [filterPointsActivity, setFilterPointsActivity] = useState(["==", ['get', 'pointInLine'], false]),
        [filterPointsInLineActivity, setFilterPointsInLineActivity] = useState(["==", ['get', 'pointInLine'], true]),
        [filterDistrict, setFilterDistrict] = useState(['match', ['get', 'name'], 'none', true, false]),
        [filteredData, setFilteredData] = useState(props.activities),
        { t } = useTranslation('general', { useSuspense: false })

    const mapContainer = useRef(null)

    const toggleLegend = () => {
        setLegend(!legend)
    },
        toggleLayers = () => {
            setLayers((layers + 1) % (mapStyles.length))
        }

    useEffect(() => {
        if (map) {
            const pointActivitiesFilter = ["==", ['get', 'pointInLine'], false],
                pointInLineActivitiesFilter = ["==", ['get', 'pointInLine'], true]

            let districtFilter,
                sourceData

            if (props.filters_activities.length > 0) {
                const activityFilter = ['match', ['get', 'sport'], [...props.filters_activities], true, false]
                map.setFilter('lineActivities', activityFilter)
                map.setFilter('pointActivities', ['all', activityFilter, pointActivitiesFilter])
                map.setFilter('pointInLineActivities', ['all', activityFilter, pointInLineActivitiesFilter])

                setFilterLineActivity(activityFilter)
                setFilterPointsActivity(['all', activityFilter, pointActivitiesFilter])
                setFilterPointsInLineActivity(['all', activityFilter, pointInLineActivitiesFilter])
            }
            else {
                map.setFilter('lineActivities', null)
                map.setFilter('pointActivities', pointActivitiesFilter)
                map.setFilter('pointInLineActivities', pointInLineActivitiesFilter)

                setFilterLineActivity(null)
                setFilterPointsActivity(pointActivitiesFilter)
                setFilterPointsInLineActivity(pointInLineActivitiesFilter)
            }

            if (props.filters_districts.length > 0) {
                districtFilter = ['match', ['get', 'name'], [...props.filters_districts], true, false]

                const districtsCollection = turf.featureCollection(
                    props.districts.features
                        .filter(district => props.filters_districts.includes(district.properties.name))
                ),

                    linesID = Array.from(new Set(turf.pointsWithinPolygon(
                        turf.explode(
                            turf.featureCollection(
                                props.activities.features
                                    .filter(feature => feature.geometry.type === 'LineString')
                            )
                        ),
                        districtsCollection
                    ).features.map(feature => feature.properties.id))),

                    lines = props.activities.features.filter(feature => linesID.includes(feature.properties.id)),

                    points = turf.pointsWithinPolygon(
                        turf.featureCollection(props.activities.features.filter(feature => feature.geometry.type === 'Point')),
                        districtsCollection
                    ).features;

                sourceData = turf.featureCollection([...lines, ...points])
            }
            else {
                districtFilter = ['match', ['get', 'name'], 'none', true, false]
                sourceData = props.activities
            }

            map.setFilter('districts', districtFilter)
            map.getSource('activities').setData(sourceData)

            setFilterDistrict(districtFilter)
            setFilteredData(sourceData)


        }
    }, [props.activities.features.length, props.filters_activities.length, props.filters_districts.length])

    useEffect(() => {
        if (map) {
            map.setStyle(`mapbox://styles/mapbox/${mapStyles[layers]}-v9`)
            map.once('styledata', () => {
                loadLayers(map, {
                    sportsIcons: sportsIcons,
                    districts: props.districts,
                    activities: filteredData,
                    events: props.events
                },
                    mode,
                    {
                        pointInLineActivities: filterPointsInLineActivity,
                        pointActivities: filterPointsActivity,
                        lineActivities: filterLineActivity,
                        districts: filterDistrict
                    })
            })
        }
    }, [layers])

    useEffect(() => {

        initializeMap({
            setMap,
            mapContainer,
            layers,
            mode,
            sources: {
                sportsIcons: sportsIcons,
                activities: props.activities,
                districts: props.districts,
                events: props.events
            },
            filters: {
                pointInLineActivities: filterPointsInLineActivity,
                pointActivities: filterPointsActivity,
                lineActivities: filterLineActivity,
                districts: filterDistrict
            }
        })

    }, [])

    useEffect(() => {
        const activities = ['pointActivities', 'lineActivities', 'pointInLineActivities']
        if (map) {
            switch (mode) {
                case ('events'):
                    activities.forEach(layer => {
                        map.setLayoutProperty(layer, 'visibility', 'none')
                    })
                    map.setLayoutProperty('events', 'visibility', 'visible')
                    break;
                case ('activities'):
                        activities.forEach(layer => {
                            map.setLayoutProperty(layer, 'visibility', 'visible')
                        })
                        map.setLayoutProperty('events', 'visibility', 'none')
                    break;
                default:
                    break;
            }
        }

    }, [mode])

    const modes = mapModes.map(mapMode => <li key={mapMode} className={`has-text-weight-bold ${mapMode === mode ? 'is-active' : 'has-background'}`} style={style.tabsComponent} onClick={() => setMode(mapMode)}><Link to=''>{t(mapMode)}</Link></li>)

    return (
        <div style={style.map} ref={el => (mapContainer.current = el)} >
            {props.children}
            {(legend && mode !== 'events') ? <Legend toggleLegend={toggleLegend} /> : null}
            <div style={style.tabsContainer}>
                <div className="tabs is-centered is-toggle is-small" style={style.tabs}>
                    <ul>
                        {modes}
                    </ul>
                </div>
            </div>
            <div className="mapboxgl-control-container" >
                <div className="mapboxgl-ctrl-bottom-right" style={{ marginBottom: '13.75rem' }}>
                    <div className="mapboxgl-ctrl-group mapboxgl-ctrl">
                        <button className={mode !== 'events' ? "icon legend is-size-5" : 'is-sr-only'} onClick={() => toggleLegend()}>
                            <FontAwesomeIcon icon={faInfoCircle} />
                        </button>
                        <button className="icon legend is-size-5" onClick={() => toggleLayers()}>
                            <FontAwesomeIcon icon={faLayerGroup} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default connect(
    mapStateToProps,
    null
)(Map)


// map.on('draw.create', e => {
//     const feature = e.features[0]
//     draw.delete(feature.id)
//     store.dispatch(selectActivity(feature))
//     navigate(`activity/${feature.id}/edit`)
// })