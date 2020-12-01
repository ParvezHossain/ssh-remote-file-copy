var tar = require('tar-fs');
var zlib = require('zlib');
var SSH = require('ssh2');
var conn = new SSH();

function transferDirectory(conn, remotePath, localPath, compression, cb) {
    console.log(localPath);
    var cmd = 'tar cf - "' + remotePath + '" 2>/dev/null';

    if (typeof compression === 'function') {
        cb = compression;
    } else if (compression === true) {
        compression = 6;
    }

    // Apply compression if desired
    if (typeof compression === 'number' && compression >= 1 && compression <= 9) {
        cmd += ' | gzip -' + compression + 'c 2>/dev/null';
    } else {
        compression = undefined;
    }

    conn.exec(cmd, function (err, stream) {
        if (err) {
            return cb(err);
        }
        var exitErr;
        var tarStream = tar.extract(localPath);
        tarStream.on('finish', function () {
            cb(exitErr);
        });

        stream.on('exit', function (code, signal) {
            if (typeof code === 'number' && code !== 0) {
                exitErr = new Error('Remote process exited with code ' + code);
            } else if (signal) {
                exitErr = new Error('Remote process killed with signal ' + signal);
            }

        }).on('data', function(data) {
            // console.log('STDOUT: ' + data);
        }).stderr.resume();
        if (compression) {
            stream = stream.pipe(zlib.createGunzip());
        }
        stream.pipe(tarStream);
    });
}

var connectionSettings = {
    host: '192.168.1.221',
    port: 22,
    username: 'sct_server',
    password: 'sct2017'
};

function killProcess() {
    conn.end();
}

conn.on('ready', function () {
    path_array = ["/var/www/html"];
    // path_array = ["/var/www/html/dist", "/var/www/html/base_visu", "/var/www/html/mes_visu", "/var/www/html/quali_visu", "/var/www/html/report_visu", "/var/www/html/user_session"];
    let f = 0;
    for (let index = 0; index < path_array.length; index++) {
        var lastword = path_array[index].split("/").pop();
        
        // transferDirectory(conn, `${path_array[index]}`, __dirname + `/${lastword}`, true, function (err) {
        transferDirectory(conn, `${path_array[index]}`,`D:\\Local-Server/${lastword}`, true, function (err) {
            if (err) {
                throw err;
            };
            console.log('Remote directory succesfully downloaded!');    
            f++;
            if(f == path_array.length) {
                conn.end();
            }
        }
        );
        
    }
}).connect(connectionSettings);