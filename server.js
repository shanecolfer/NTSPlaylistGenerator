//Require express
//Require ejs locals for html rendering
const express = require('express');
const ejsLocals = require('ejs-locals');
var SpotifyWebApi = require('spotify-web-api-node');

//Create express server 
const app = express();

//Define scopes
var scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public'],
  redirectUri = 'http://localhost:3000/callback',
  clientId = 'fd8fca00814a47628439ca0379826f33',
  state = 'user-modify-playback-state';

//Define credentials
var credentials = {
    clientId: clientId,
    clientSecret: '90779980714142238fc58cb3754f9c04',
    redirectUri: redirectUri
  };

//Make spotify API object using credentials
var spotifyApi = new SpotifyWebApi(credentials);
  
//Start server
app.listen(3000, function() {
    console.log('listening on port 3000');
})

/* Handle authorization callback from Spotify */
app.get('/callback', function(req, res) {

    console.log('in callback')

    /* Read query parameters */
    var code  = req.query.code; // Read the authorization code from the query parameters
    var state = req.query.state; // (Optional) Read the state from the query parameter

    // Retrieve an access token and a refresh token
    spotifyApi.authorizationCodeGrant(code).then(
    function(data) {
      console.log('The token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);
      console.log('The refresh token is ' + data.body['refresh_token']);
  
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);

      res.redirect('/loggedIn');
    },
    function(err) {
      console.log('Something went wrong!', err);
    }
  )
});
  
//Home
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
})

//Login to Spotify
app.post('/login', function(req, res){

    console.log('login triggered');
    // Create the authorization URL
    var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
    res.redirect(authorizeURL);
    
})

//Display user info
app.get('/loggedIn', function(req, res){
    res.sendFile(__dirname + '/logged_in.html');
    // Get the authenticated user
    spotifyApi.getMe()
        .then(function(data) {
            console.log('Some information about the authenticated user', data.body);
    }, function(err) {
            console.log('Something went wrong!', err);
    });
    
})

//Scrape URL
app.post('/scrapeURL', function(req,res)
{

})


