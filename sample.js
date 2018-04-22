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
