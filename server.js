//Require express
//Require ejs locals for html rendering
const express = require('express');
const ejsLocals = require('ejs-locals');
var SpotifyWebApi = require('spotify-web-api-node');

const { parse } = require('querystring');
const http = require('http');

const {PythonShell} = require('python-shell');

//Create express server 
const app = express();

//var playlistURL = ""

//Define scopes
var scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public'],
  redirectUri = 'http://ntsplaylistgenerator.com/callback',
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
         //Create spotify playlsit
            spotifyApi.createPlaylist(finishedOutput[0]['playlistTitle'], { 'description': 'Created by script', 'public': true })
            .then(function(data) {
                //Write to log
                console.log('Created playlist!');
                //Get playlist ID
                playlistID = data.body['id']
                // Add tracks to created playlist
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

}


//Start server
app.listen(80, function() {
    console.log('listening on port 80');
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
    // Get the authenticated user
    spotifyApi.getMe()
        .then(function(data) {
            console.log('Some information about the authenticated user', data.body);
            res.sendFile(__dirname + '/logged_in.html');
    }, function(err) {
            console.log('Something went wrong!', err);
    });
    
})

//Scrape URL
app.post('/scrapeURL', function(req,res)
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
                    //Create spotify playlsit
                        spotifyApi.createPlaylist(finishedOutput[0]['playlistTitle'], { 'description': 'Created by script', 'public': true })
                        .then(function(data) {
                            //Write to log
                            console.log('Created playlist!');
                            //Get playlist ID
                            playlistID = data.body['id']
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

    
})


