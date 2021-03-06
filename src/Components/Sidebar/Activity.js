import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faMinus, faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons'
import { faTwitter, faFacebook, faYoutube } from "@fortawesome/free-brands-svg-icons"
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { Link } from '@reach/router'
import uuidv4 from 'uuid/v4'


import Description from './Components/Description'
import Image from './Components/Image'
import NotFound from './Components/NotFound'
import Footer from './Components/Footer'
import Comments from './Components/Comments'

const mapStateToProps = state => ({
    activities: state.activities,
    user: state.user
})

const Basics = props => {
        const { t } = useTranslation('general', { useSuspense: false });

        const selectedTags = (collection, collectionName) => {
            const safeCollection = collection ? collection : {},
                selected = Object.entries(safeCollection).filter(entry => entry[1]).map(entry => {
                    return (
                        <span key={uuidv4()} className={`tag`}>{t(`${collectionName}.${entry[0]}`)}</span>
                    )
                })
            return selected
        },
            showCollection = collection => {
                if (!collection) {
                    return false
                }
                else if (Object.values(collection).filter(value => value).length === 0) {
                    return false
                }
                else {
                    return true
                }

            }

        return (
            <>
                <p><span className="has-text-weight-bold">Deporte: </span>{props.data.sport}</p>
                <br />
                <div><span className="has-text-weight-bold">¿Cuándo se practica?: </span>{props.data.type === 'puntual' ?
                    <p>Puntualmente</p> :
                    <p>{props.data.schedule}</p>
                }
                    <br />
                </div>
                <div className={showCollection(props.data.feature) ? `` : `is-sr-only`}>
                    <p><span className="has-text-weight-bold">Cualidades del espacio:</span></p>
                    <div className="tags">{selectedTags(props.data.feature, 'feature')}</div>
                    <div></div>
                </div>
                <div className={showCollection(props.data.improvements) ? `` : `is-sr-only`}>
                    <p><span className="has-text-weight-bold">Mejoras para el espacio:</span></p>
                    <div className="tags">{selectedTags(props.data.improvements, 'improvements')}</div>
                    <div></div>
                </div>
                <div className={showCollection(props.data.urbanFurniture) ? `` : `is-sr-only`}>
                    <p><span className="has-text-weight-bold">Mejoras para el mobiliario urbano:</span></p>
                    <div className="tags">{selectedTags(props.data.urbanFurniture, 'urbanFurniture')}</div>
                    <div></div>
                </div>
            </>
        )
    },
    Details = props => {
        return (
            <div className="box has-background-white-bis is-paddingless">
                <h2 className="title is-size-6 has-background-grey-lighter" style={{ paddingLeft: "0.25rem" }}>Contacto</h2>
                <div className="subtitle is-size-7">
                    {props.data.facebook ? <div><a href={props.data.facebook} target="_blank" rel="noopener noreferrer"><span className="icon"><FontAwesomeIcon icon={faFacebook} /></span>Facebook</a></div> : null}
                    {props.data.twitter ? <div><a href={props.data.twitter} target="_blank" rel="noopener noreferrer"><span className="icon"><FontAwesomeIcon icon={faTwitter} /></span>Twitter</a></div> : null}
                    {props.data.youtube ? <div><a href={props.data.youtube} target="_blank" rel="noopener noreferrer"><span className="icon"><FontAwesomeIcon icon={faYoutube} /></span>Youtube</a></div> : null}
                    {props.data.email ? <div><a href={`mailto:${props.data.email}`} target="_blank" rel="noopener noreferrer"><span className="icon"><FontAwesomeIcon icon={faEnvelope} /></span>Correo</a></div> : null}
                    {props.data.phone ? <div><a href={`tel:${props.data.email}`} target="_blank" rel="noopener noreferrer"><span className="icon"><FontAwesomeIcon icon={faPhone} /></span>Teléfono</a></div> : null}
                    <br />
                </div>

            </div>
        )
    }


const Sidebar = props => {
    const [expanded, setExpanded] = useState(true),
        [data, setData] = useState(undefined)

    useEffect(() => {
        setData(props.activities.features.find(feature => feature.properties.id === props.id))
    }, [props.id])

    if (data) {
        const details = (data.properties.facebook || data.properties.twitter || data.properties.youtube || data.properties.email || data.properties.phone) ? <Details data={{ ...data.properties }} /> : null

        return (
            <article className="card animated fadeIn faster" style={{ zIndex: 10, maxHeight: "75vh", overflowY: "auto", position: "absolute", top: "4.5rem", left: "0.7rem", width: "20rem" }}>
                <header className="card-header">
                    <h2 className="is-size-6 card-header-title">
                        {data.properties.name ? data.properties.name : data.properties.sport}
                    </h2>
                    <div className="card-header-icon" onClick={() => setExpanded(!expanded)}>
                        <span className="icon">
                            <FontAwesomeIcon icon={faMinus} />
                        </span>
                    </div>
                    <Link to='/' className="card-header-icon">
                        <span className="icon">
                            <FontAwesomeIcon icon={faTimes} />
                        </span>
                    </Link>
                </header>
                <div style={{ display: expanded ? "block" : "none", padding: "0 1rem" }}>
                <Image data={data.properties.image} />

                    <div className="card-content">
                        <Basics data={data.properties} />
                        <Description data={data.properties.description} />
                        {details}
                        <Comments activity={data.properties.id} />
                    </div>
                </div>
                <Footer user={props.user} id={data.properties.id} creatorUID={data.properties.creatorUID} collection={'sports'} type={'Activity'}/>
            </article>
        )
    }

    else return <NotFound />



}

export default connect(
    mapStateToProps,
    null
)(Sidebar)
