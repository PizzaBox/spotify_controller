# spotify_controller
Control Spotify playback from an easy to use script, with no dependencies required.

### Functions:

#### .init()
* Description: *Initialize the script*


#### .pause((error, \<track object\>) =>{})
* Description: *Pause playback*

#### .unpause((error, \<track object\>) =>{})
* Description: *Unpause playback*
       
#### .play(({uri: \<string spotify uri\>, context: \<string spotify uri\>}, (error, \<track object\>)=>{})
* Description: *Play a Spotify URI with or without context*
* Params:
  * **uri (required)**: The URI of the track you would like to play. Example: **spotify:track:4uLU6hMCjMI75M1A2tKUQC**
  * **context (optional)**: The context is the album/playlist uri that the track uri belongs to. This allows you to continue playing the next track the inital request is finished. If not set, playback will stop after the track is finished (or repeat the same track if you have loop repeat set in spotify)
         
#### .status: ({returnafter: \<int seconds\>, returnon: \<string comma seperated options\>, (error, \<track object\>)=>{})
* Description: *Returns a <track object> containing information about the currently playing track.*
* Params:
  * **returnafter (optional)**: Will return data after set seconds. Requests longer than 30s will sometimes timeout.
  * **returnon (optional)**: Will return data when specified events happen. Events: login/logout/error/play/pause. Example: login,play,pause
        
#### .on(\<event\>, (\<track object\>)=>{})
* Desciption: *Runs a function and returns a <track object> when the event is triggered.*
* Events:
  * **ready**: Fired when the controller is ready
  * **playback_change**: Fired when the player is paused or starts playing. Use data.playing to get the status
  * **track_change**: Fired when the track changes.
  * **track_restart**: Fired when the track restarts.

### Track Object:
```javascript
  {
	"version": 0,
	"client_version": "xxxxx",
	"playing": false,
	"shuffle": false,
	"repeat": true,
	"play_enabled": true,
	"prev_enabled": true,
	"next_enabled": true,
	"track": {
		"track_resource": {
			"name": "Never Gonna Give You Up",
			"uri": "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
			"location": {
				"og": "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"
			}
		},
		"artist_resource": {
			"name": "Rick Astley",
			"uri": "spotify:artist:0gxyHStUsqpMadRV0Di1Qt",
			"location": {
				"og": "https://open.spotify.com/artist/0gxyHStUsqpMadRV0Di1Qt"
			}
		},
		"album_resource": {
			"name": "Whenever You Need Somebody",
			"uri": "spotify:album:6N9PS4QXF1D0OWPk0Sxtb4",
			"location": {
				"og": "https://open.spotify.com/album/6N9PS4QXF1D0OWPk0Sxtb4"
			}
		},
		"length": 213,
		"track_type": "normal"
	},
	"context": {},
	"playing_position": 58.435,
	"server_time": 0000000,
	"volume": 0.57999539,
	"online": true,
	"open_graph_state": {
		"private_session": false
	},
	"running": true
}
```

### Example Usage:
```javascript
const Controller = require('./spotify_controller');

Controller.init();
Controller.on('ready', ()=>{
    console.log('Controller is ready')
    Controller.on('playback_change', (data)=>{
        console.log(`Is playing: ${data.playing} (${Math.floor(data.playing_position)}/${data.track.length})`)
    });

    Controller.on('track_change', (data)=>{
        console.log(`Now playing: ${data.track.track_resource.name} by ${data.track.artist_resource.name} off of the album ${data.track.album_resource.name}`)
    });

    setTimeout(()=>{
    	Controller.play({uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC', context: 'spotify:album:6N9PS4QXF1D0OWPk0Sxtb4'}, (err, data)=>{
    		if (err){
    			console.log(err);
    			return;
    		}
    		console.log('Gottem');
    		setTimeout(()=>{
    			Controller.pause();
    			setTimeout(()=>{
    				Controller.unpause();
    			}, 2000)
    		}, 5000);
    	})
    }, 5000);   
});
  
```
