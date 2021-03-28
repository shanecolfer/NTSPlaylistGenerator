//Require express
//Require ejs locals for html rendering
const express = require('express');
const session = require('express-session');
const ejsLocals = require('ejs-locals');
var SpotifyWebApi = require('spotify-web-api-node');

const { parse } = require('querystring');
const https = require('https');
const fs = require('fs');
const port = 443;

app = express();

//Set up keys for HTTPS
var key = fs.readFileSync('/etc/letsencrypt/live/ntsplaylistgenerator.com/privkey.pem').toString();
var cert = fs.readFileSync('/etc/letsencrypt/live/ntsplaylistgenerator.com/fullchain.pem').toString();

var options = {
    key: key,
    cert: cert
};

const {PythonShell} = require('python-shell');
const { Certificate } = require('crypto');

//Create express server 
var server = https.createServer({key: key, cert: cert}, app);

server.listen(port,function(){
    console.log("Server listening on port: " + port);
})

// Redirect from http port 80 to https
var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);

//Configure express-session
app.use(session(
    {
        //Set maximum age of the cookie in milliseconds
        cookie: 
        {
            path: '/',
            maxAge: 1000 * 60 * 60, //Max age of 1 hr
            secure: true,
        },
    
        //Set name for the session id cookie
        name: 'session_id',
    
        resave: false,
    
        saveUninitialized: false,
    
        //Set key used to sign cookie
        secret: 'shane'
    }
    ))


//var playlistURL = ""

//Define scopes
var scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public'],
  redirectUri = 'https://ntsplaylistgenerator.com/callback',
  clientId = 'fd8fca00814a47628439ca0379826f33',
  state = 'user-modify-playback-state';

//Define credentials
var credentials = {
    clientId: clientId,
    clientSecret: '90779980714142238fc58cb3754f9c04',
    redirectUri: redirectUri
  };

// Author James Harrington 2014
function base64(file, callback){
    var coolFile = {};
    function readerOnload(e){
      var base64 = btoa(e.target.result);
      coolFile.base64 = base64;
      callback(coolFile)
    };
  
    var reader = new FileReader();
    reader.onload = readerOnload;
  
    var file = file[0].files[0];
    coolFile.filetype = file.type;
    coolFile.size = file.size;
    coolFile.filename = file.name;
    reader.readAsBinaryString(file);
  }

//Make spotify API object using credentials
var spotifyApi = new SpotifyWebApi(credentials);

function collectRequestData(request, callback) {
    const FORM_URLENCODED = 'application/x-www-form-urlencoded';
    if(request.headers['content-type'] === FORM_URLENCODED) {
        let body = '';
        request.on('data', chunk => {
            body += chunk.toString();
        });
        request.on('end', () => {
            callback(parse(body));
        });
    }
    else {
        callback(null);
    }
}

function createSpotifyPlaylist(finishedOutput){

    //Declare array to hold track IDs of searched tracks
    var trackIDs = []

    //Get length of input array for loop
    var count = Object.keys(finishedOutput).length;

    //Declare string to hold playlist ID of created playlist
    var playlistID = ""

    //Search for tracks
    for(var i = 1; i < count; i++)
    {
        //Reset tokens to current users from cookie
        spotifyApi.setAccessToken(req.session.access_token)
        spotifyApi.setRefreshToken(req.session.refresh_token)
        // Search tracks whose artist's name contains 'Kendrick Lamar', and track name contains 'Alright'
        spotifyApi.searchTracks('track:' + finishedOutput[i]['title'] + " " + "artist:" + finishedOutput[i]['artist'])
            .then(function(data) {
                try{
                    //Push to array of track IDs
                    trackIDs.push("spotify:track:" + data.body['tracks']['items'][0]['id']);
                }
                catch(err)
                {
                    console.log("No ID")
                }
        }, function(err) {
                console.log('Something went wrong!', err);
        })
    }

    //Wait 2 seconds for searching to finish before creating playlist
    setTimeout(() => { 

            //Reset tokens to current users from cookie
            spotifyApi.setAccessToken(req.session.access_token)
            spotifyApi.setRefreshToken(req.session.refresh_token)
            //Create spotify playlsit
            spotifyApi.createPlaylist(finishedOutput[0]['playlistTitle'], { 'description': 'Created by script', 'public': true })
            .then(function(data) {
                //Write to log
                console.log('Created playlist!');
                //Get playlist ID
                playlistID = data.body['id']
                // Add tracks to created playlist
                spotifyApi.setAccessToken(req.session.access_token)
                spotifyApi.setRefreshToken(req.session.refresh_token)
                spotifyApi.addTracksToPlaylist(playlistID, trackIDs)
                .then(function(data) {
                    console.log('Added tracks to playlist!');
                    //Return true
                    return true
                }, function(err) {
                    console.log('Something went wrong!', err);
                    return false
                });

            }, function(err) {
                    console.log('Something went wrong!', err);
                    return false
    }); }, 2000);

    //Add playlist image
    base64('ntslogo.png'), function(data){
        console.log(data.base64)
      }

    // Upload a custom playlist cover image
    spotifyApi.uploadCustomPlaylistCoverImage(playlistID,data.base64)
    .then(function(data) {
    console.log('Playlsit cover image uploaded!');
    }, function(err) {
    console.log('Something went wrong!', err);
    });

}



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

      //Assign these to cookie
      req.session.access_token = data.body['access_token']
      req.session.refresh_token = data.body['refresh_token']

      console.log("session.accesstoken" + req.session.access_token)

      res.redirect('/loggedIn');
    },
    function(err) {
      console.log('Something went wrong!', err);
    }
  )
});
  
//Home
app.get('/', function(req, res){
    //Send index to web browser
    res.sendFile(__dirname + '/index.html')
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

    console.log("session.accesstoken" + req.session.access_token)

    //Reset tokens to current users from cookie
    try {
        spotifyApi.setAccessToken(req.session.access_token)
        spotifyApi.setRefreshToken(req.session.refresh_token) // may throw three types of exceptions
      } catch (e) {
          console.log("No access token redirect to login")
          res.redirect("/")
      }


    // Get the authenticated user
    spotifyApi.getMe()
        .then(function(data) {
            console.log('Some information about the authenticated user', data.body);
            //Set session id to users email.
            req.session.session_id = data.body.email
            res.sendFile(__dirname + '/logged_in.html');
            console.log(req.session.session_id)
    }, function(err) {
            console.log('Something went wrong!', err);
            res.redirect("/")
    });
    
})

//Scrape URL
app.post('/scrapeURL', function(req,res)
{  
    console.log(req.session.session_id)

    if(req.session.session_id == null)
    {
        res.redirect('/')
    }
    else
    {
        var playlistCreated
        var playlistURL = ""

        collectRequestData(req, result => {
            console.log(result.playlistURL)
            playlistURL = result.playlistURL

            console.log('playlistURL: ' + playlistURL)

            let options = {
                mode: 'text',
                pythonOptions: ['-u'], // get print results in real-time
                scriptPath: __dirname,
                args: [playlistURL]
            };

            PythonShell.run('webscraper.py', options, function (err, results) {

                console.log(results)
                //If results equal null, bad URL passed and write to page.
                if (results === null)
                {
                    res.sendFile(__dirname + '/error.html');
                }
                else //Else if grand carry on to creating playlist
                {
                    //JSONify the result
                    var finishedOutput = JSON.parse(results);

                    console.log(finishedOutput);

                    //Declare array to hold track IDs of searched tracks
                    var trackIDs = []

                    //Get length of input array for loop
                    var count = Object.keys(finishedOutput).length;

                    //Declare string to hold playlist ID of created playlist
                    var playlistID = ""

                    //Search for tracks
                    for(var i = 1; i < count; i++)
                    {
                        //Reset tokens to current users from cookie
                        spotifyApi.setAccessToken(req.session.access_token)
                        spotifyApi.setRefreshToken(req.session.refresh_token)

                        //Write track arist and title to log
                        //console.log("Title: " + finishedOutput[i]['title'] + " " + "Artist: " + finishedOutput[i]['artist'])

                        // Search tracks whose artist's name contains 'Kendrick Lamar', and track name contains 'Alright'
                        spotifyApi.searchTracks('track:' + finishedOutput[i]['title'] + " " + "artist:" + finishedOutput[i]['artist'])
                            .then(function(data) {
                                try{
                                    //Push to array of track IDs
                                    trackIDs.push("spotify:track:" + data.body['tracks']['items'][0]['id']);
                                    //Write added to console
                                    //console.log("Added --------------")
                                }
                                catch(err)
                                {
                                    //console.log("No ID --------------")
                                }
                        }, function(err) {
                                console.log('Something went wrong!', err);
                        })
                    }

                    //Wait 2 seconds for searching to finish before creating playlist *** SHOULD THIS BE LONGER?
                    setTimeout(() => { 
                        //Reset tokens to current users from cookie
                        spotifyApi.setAccessToken(req.session.access_token)
                        spotifyApi.setRefreshToken(req.session.refresh_token)
                        //Create spotify playlsit
                            spotifyApi.createPlaylist(finishedOutput[0]['playlistTitle'], { 'description': 'Created by script', 'public': true })
                            .then(function(data) {
                                //Write to log
                                console.log('Created playlist!');
                                //Get playlist ID
                                playlistID = data.body['id']
                                //Reset tokens to current users from cookie
                                spotifyApi.setAccessToken(req.session.access_token)
                                spotifyApi.setRefreshToken(req.session.refresh_token)
                                // Add tracks to created playlist
                                spotifyApi.addTracksToPlaylist(playlistID, trackIDs)
                                .then(function(data) {
                                    console.log('Added tracks to playlist!');
                                    //Return true
                                    res.sendFile(__dirname + '/playlist_created.html');
                                }, function(err) {
                                    console.log('Something went wrong!', err);
                                    res.sendFile(__dirname + '/error.html'); 
                                });

                            }, function(err) {
                                    console.log('Something went wrong!', err);
                                    res.sendFile(__dirname + '/error.html'); 
                    }); }, 2000);
                }
            });
        })
    }
    
})


