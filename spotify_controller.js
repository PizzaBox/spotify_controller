const request_libs = {
    'http:': require('http'),
    'https:': require('https')
}
const url = require('url');

const run = require('child_process').exec;
const EventEmitter = require('events').EventEmitter;
const Event = new EventEmitter();

const default_headers = {
    'Origin': 'https://open.spotify.com',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:56.0) Gecko/20100101 Firefox/56.0'
};

const Controller = {
    port: null,
    csrf: null,
    token: null,
    init: ()=>{
        Private.getPort((err, port)=>{
            if (err){
                console.log(`Error getting port`, err)
                return;
            }
            Controller.port = port;
            Private.getToken((err, token)=>{
                if (err){
                    console.log(`Error requesting token`, err);
                    return;
                }
                Controller.token = token; 
                Private.get('simplecsrf/token.json', (err, data)=>{
                    if (err){
                        console.log(`Error getting csrf token`, err);
                        return;
                    }
                    Controller.csrf = data.token;
                    Event.emit('ready');
                    Private.eventsWorker();
                })
            });
        })
    },
    pause: (callback)=>{
        if (callback == undefined){
            callback = function(){}
        }
        Private.get('remote/pause.json', {pause: true}, (err, data)=>{
            callback(err, data);
        })
    },
    unpause: (callback)=>{
        if (callback == undefined){
            callback = function(){}
        }
        Private.get('remote/pause.json', {pause: false}, (err, data)=>{
            callback(err, data);
        })    
    },
    play: (params, callback)=>{ //params = uri, context
        if (callback == undefined){
            callback = function(){}
        }
        Private.get('remote/play.json', params, (err, data)=>{
            callback(err, data)
        })    
    },
    status: (params, callback)=>{ // params = returnafter (seconds), returnon = login/logout/error/play/pause
        if (callback == undefined){
            callback = function(){};
        }
        if (typeof params == 'function'){
            callback = params;
            params = {};

        }
        Private.get('remote/status.json', params, (err, data)=>{
            callback(err, data)
        })
    },
    on: (event, callback)=>{
        Event.on(event, callback);
    }
}

module.exports = Controller;

const Private = {
    getPort: (callback)=>{
        run('tasklist | findstr SpotifyWebHelper.exe', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                callback(error);
                return;
            }
            let pid = stdout.replace(/\s+/ig,' ').split(' ')[1];
            run(`netstat -ano | findstr ${pid}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    callback(error);
                    return;
                }
                callback(null, stdout.replace(/\s+/ig,' ').split(' ')[2].split(':')[1])
            });
        });
    },
    getToken: (callback, retries)=>{
        if (retries == undefined){
            retries = 0;
        }
        Private.request('https://open.spotify.com/token', (err, data)=>{
            if (err){
                console.log(`Error requesting token: ${err}`);
                callback(err);
                return;
            }
            try{
                data = JSON.parse(data)['t'];
            }catch(e){
                retries++;
                if (retries > 10){
                    callback(new Error('Failed attempting to get token 10 times. Aborting.'))
                    return;
                }
                setTimeout(()=>{
                    Private.getToken(callback, retries);    
                }, 500)
                return;
            }
            callback(null, data)
        })
    },
    get: (path, params, callback)=>{
        if (typeof params == 'function'){
            callback = params;
            params = undefined;
        }
        let params_string = ''
        if (params){
            params_string = '?'
            params.oauth = Controller.token;
            params.csrf = Controller.csrf;
            for (let key in params){
                params_string += `${key}=${params[key]}&`
            }
            params_string = params_string.slice(0, -1);
        }
        Private.request(`http://127.0.0.1:${Controller.port}/${path}${params_string}`, (err, data)=>{
            if (err){
                callback(err)
                return;
            }
            try{
                data = JSON.parse(data);
            }catch(e){
                callback(e)
                return;
            }
            callback(err, data);
        });
    },
    track_change_lockout: false,
    eventsWorker: (last_check)=>{
        let status_params = {returnafter: 10, returnon: 'login,logout,error,pause,play'}
        if (last_check == undefined){
            status_params = {}
        }
        Controller.status(status_params, (err, data)=>{ //, returnon: 'login,logout,error,pause,play'
            if (err){
                console.log('eventWorker error', err);
                return;
            }
            if (last_check == undefined){
                last_check = {
                    playing: null,
                    playing_postiion: null,
                    track_id: null
                }
            }
            if (data.track == undefined){
                Private.eventsWorker(last_check);
                return;
            }   
            if (data.playing != last_check.playing){
                Event.emit('playback_change', data);
                if (data.track.track_resource.uri == last_check.track_id && data.playing_position < 1){
                    Event.emit('track_restart', data);
                }else if (data.track.track_resource.uri != last_check.track_id){
                    Event.emit('track_change', data);
                }
            }else if (data.track){
                if (data.track.track_resource.uri != last_check.track_id && data.playing_position < 1){
                    if (Private.track_change_lockout == false){
                        Event.emit('track_change', data);
                        Private.track_change_lockout = true; 
                        setTimeout(()=>{
                            Private.track_change_lockout = false;     
                        }, 200); 
                    }
                }
            }
            last_check = {
                playing: data.playing,
                playing_postiion: data.playing_position,
                track_id:  data.track.track_resource.uri
            }
            Private.eventsWorker(last_check);
        });
    },
    request: function(path, callback){
        let path_parse = url.parse(path)
        const options = {
            hostname: path_parse.hostname,
            path: path_parse.path,
            port: path_parse.port,
            headers: {
                'Origin': 'https://open.spotify.com',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:56.0) Gecko/20100101 Firefox/56.0'
            }
        };
        const req = request_libs[path_parse.protocol].get(options, (res) => {
            res.setEncoding('utf8');

            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            });

            res.on('end', () => {
                callback(null, data)
            });
        });

        req.on('error', (e) => {
            callback(new Error('Request Error', e))
            console.error(`problem with request: ${e.message}`);
        });
        req.end();
    }
}
