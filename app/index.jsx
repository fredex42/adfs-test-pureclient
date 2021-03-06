import React from 'react';
import {render} from 'react-dom';
import {BrowserRouter, Link, Route, Switch, Redirect, withRouter} from 'react-router-dom';
import { library } from '@fortawesome/fontawesome-svg-core'
import { faFolder, faFolderOpen, faTimes, faSearch, faCog, faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons'
import RootComponent from "./RootComponent.jsx";
import NotFoundComponent from "./NotFoundComponent.jsx";
import OAuthCallbackComponent from "./OAuthCallbackComponent.jsx";
import LoginBanner from "./LoginBanner.jsx";

library.add(faFolder, faFolderOpen, faTimes, faSearch, faCog, faUser, faSignOutAlt);

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            startup: true,
            loading: false,
            redirectToLogin: false,
            lastError: null,
            clientId: "",
            resource: "",
            oAuthUri: ""
        }

        const currentUri = new URL(window.location.href);
        this.redirectUri = currentUri.protocol + "//" + currentUri.host + "/oauth2/callback";
    }

    setStatePromise(newState) {
        return new Promise((resolve,reject)=>this.setState(newState, ()=>resolve()));
    }

    haveToken() {
        return window.sessionStorage.getItem("adfs-test:token");
    }

    async loadOauthData() {
        const response = await fetch("/meta/oauth/config.json");
        switch(response.status){
            case 200:
                console.log("got response data");
                const content = await response.json();
                return this.setStatePromise({
                    clientId: content.clientId,
                    resource: content.resource,
                    oAuthUri: content.oAuthUri,
                    startup: false
                });
            case 404:
                await response.text();  //consume body and discard it
                return this.setStatePromise({startup: false, lastError: "Metadata not found on server, please contact administrator"});
            default:
                await response.text();  //consume body and discard it
                return this.setStatePromise({
                    startup: false,
                    lastError: "Server returned a " + response.status + " error trying to access metadata"
                })
        }
    }

    async componentDidMount() {
        await this.loadOauthData();
        if(this.haveToken()) {
            console.log("have pre-existing token")
            this.setState({lastError: null});
        } else {
            this.setState({redirectToLogin: true});
        }
    }

    render(){
        // if(this.state.redirectToLogin && !this.state.startup && !this.state.lastError && !window.location.href.includes("oauth2")) {
        //     window.location.href = this.makeLoginUrl();
        //
        //     return <pre>Redirecting...</pre>
        // }

        //it's important that logout uses component= not render=. render= is evaluated at load, when oAuthUri is blank
        //need it to be evaluated at run when it is set
        //the adfs server bounces us back to /adfs/oauth2/logout when the logout process is complete so we bounce straight back to root
        return <div>
            {
                window.location.href.includes("oauth2") ? "" : <LoginBanner clientId={this.state.clientId}
                                                                            redirectUri={this.redirectUri}
                                                                            resource={this.state.resource}
                                                                            oAuthUri={this.state.oAuthUri}/>
            }
            <Switch>
                <Route exact path="/adfs/oauth2/logout" render={()=><Redirect to="/"/>}/>
                <Route exact path="/logout" component={()=>{
                    sessionStorage.removeItem("adfs-test:token")
                    return <Redirect to={this.state.oAuthUri + "/adfs/oauth2/logout"}/>
                }}/>
                <Route exact path="/oauth2/callback" render={(props)=><OAuthCallbackComponent {...props} oAuthUri={this.state.oAuthUri} clientId={this.state.clientId} redirectUri={this.redirectUri}/>}/>
                <Route exact path="/" component={RootComponent}/>
                <Route path="/" component={NotFoundComponent}/>
            </Switch>
        </div>
    }
}

const AppWithRouter = withRouter(App);
render(<BrowserRouter root="/"><AppWithRouter/></BrowserRouter>, document.getElementById("app"));