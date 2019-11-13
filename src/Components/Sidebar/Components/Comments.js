import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Editor, EditorState, RichUtils, convertToRaw } from 'draft-js'
import { draftToMarkdown } from 'markdown-draft-js'
import { Link } from '@reach/router'
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { faBold, faItalic, faUnderline, faList, faHeading } from '@fortawesome/free-solid-svg-icons'
import { useQuery, useMutation } from 'urql'
import gql from 'graphql-tag'
import { connect } from 'react-redux'
import { formatRelative } from 'date-fns'
import { es } from 'date-fns/locale'

const style = {
    paddedBot: {
        paddingBottom: '1.5rem'
    }
}

const mapStateToProps = state => ({
    user: state.user
}),
    toMarkdown = editorState => {
        return draftToMarkdown(convertToRaw(editorState.getCurrentContent()))
    }

const Comment = props => {
    return (
        <article className="media container">
            <div className="media-content">
                <div className="content">
                    <p><strong className="is-size-5 has-text-primary">{props.username}</strong> <time className="is-size-7 has-text-primary">{formatRelative(new Date(props.date), new Date(), { locale: es, weekStartsOn: 1 })}</time></p>
                    {props.comment}
                </div>
            </div>
        </article>
    )
},
    RichEditor = props => {
        const { t } = useTranslation('general', { useSuspense: false })

        const [editorState, setEditorState] = useState(EditorState.createEmpty()),
            [result, executeMutation] = useMutation(gql`
        mutation comments($author: String!, $activity: String!, $comment: String!, $date: String!, $username: String!){
            comments(author: $author, activity: $activity, comment: $comment, date: $date, username: $username){
                id
                comment
                activity
            }
        }
      `
            )

        const inputElement = useRef(null)

        const submitComment = async event => {
            event.preventDefault()
            const payload = {
                author: props.user.uid,
                activity: props.activity,
                comment: toMarkdown(editorState),
                date: new Date().toISOString(),
                username: props.user.displayName
            }

            try {
                await executeMutation(payload)
                setEditorState(EditorState.createEmpty())

            }
            catch (error) {
                console.log(error)
            }
        },
            // textBold = () => {
            //     setEditorState(RichUtils.toggleInlineStyle(editorState, 'BOLD'))
            // },
            // textItalic = () => {
            //     setEditorState(RichUtils.toggleInlineStyle(editorState, 'ITALIC'))
            // },
            // textUnderline = () => {
            //     setEditorState(RichUtils.toggleInlineStyle(editorState, 'UNDERLINE'))
            // },
            // textUnorderedList = () => {
            //     setEditorState(RichUtils.toggleBlockType(editorState, 'unordered-list-item'))
            // },
            // textHeader = () => {
            //     setEditorState(RichUtils.toggleBlockType(editorState, 'header-six'))
            // },
            handleKeyCommand = (command, editorState) => {
                const newState = RichUtils.handleKeyCommand(editorState, command)

                if (newState) {
                    setEditorState(newState);
                    return 'handled'
                }
                return 'not-handled'
            },
            focusOnEditor = () => {
                // `current` points to the mounted text input element
                inputElement.current.focus();
            }

        return (
            <form style={style.paddedBot} onSubmit={submitComment}>
                <div className="field">
                    <p className="control">
                        <input className={`input has-text-primary is-static`} type="text" value={props.user.displayName} readOnly />
                    </p>
                </div>
                <div className="field">
                    {/* 
                <div className="buttons">
                    <button className="button" type="button">
                        <FontAwesomeIcon className="icon is-size-7" icon={faBold} onClick={textBold} />
                    </button>
                    <button className="button" type="button">
                        <FontAwesomeIcon className="icon is-size-7" icon={faItalic} onClick={textItalic} />
                    </button>
                    <button className="button" type="button">
                        <FontAwesomeIcon className="icon is-size-7" icon={faUnderline} onClick={textUnderline} />
                    </button>
                    <button className="button" type="button">
                        <FontAwesomeIcon className="icon is-size-7" icon={faList} onClick={textUnorderedList} />
                    </button>
                    <button className="button" type="button">
                        <FontAwesomeIcon className="icon is-size-7" icon={faHeading} onClick={textHeader} />
                    </button>
                </div> */}

                    <div className="control" onClick={focusOnEditor}>
                        <div className="textarea content text-area-overflow">
                            <Editor
                                spellCheck={true}
                                editorState={editorState}
                                handleKeyCommand={handleKeyCommand}
                                onChange={setEditorState}
                                stripPastedStyles={true}
                                ref={inputElement}
                            />
                        </div>
                    </div>
                    <button className="button is-small is-primary is-pulled-right has-text-weight-bold">{t('comments.sendComment')}</button>
                </div>
            </form>
        )
    },
    LogIn = () => {
        return (
            <>
                <p className="has-text-weight-bold has-text-centered">Registrate para poder comentar</p>
                <div className="buttons is-centered">
                    <Link to="/user" className="button is-primary is-small has-text-weight-bold">Registrate</Link>
                </div>
            </>
        )
    },
    UpdateProfile = () => {
        return (
            <>
                <p className="has-text-centered has-text-weight-bold ">
                    Actualiza tu perfil con tu nombre de usuario para poder comentar
                </p>

                <div className="buttons is-centered">
                    <Link to="/user" className="button is-primary is-small has-text-weight-bold">Actualiza tu perfil</Link>
                </div>
            </>
        )
    },
    Comments = props => {

        const [result] = useQuery({
            query: gql`
            {
                comments (activity: "${props.activity}") {
                    author
                    comment
                    date
                    username
                }
            }
          `
        })

        if (result.error) return <p></p>
        if (result.fetching) return <p></p>

        const comments = result.data.comments.map(comment => <li key={comment.id} style={style.paddedBot}><Comment {...comment} /></li>)
        return (
            <>
                <hr className="navbar-divider" />
                {props.user ? (props.user.displayName ? <RichEditor activity={props.activity} user={props.user} /> : <UpdateProfile />) : <LogIn />}
                <ul>
                    {comments}
                </ul>
            </>
        )
    }

export default connect(
    mapStateToProps,
    null
)(Comments)