const http = require('node:http');
const EventEmitter = require('node:events')

class Emitter extends EventEmitter {}

const myEmitter = new Emitter();

const hostname = '127.0.0.1';
let port = 80;
const inputArgs = process.argv;
const putQueue = {};
const getQueue = {};

myEmitter.setMaxListeners(Infinity)

myEmitter.on('GET', (req, res) => {
    const url = new URL(req.url, `http://${hostname}/${req.url}`);
    const keyV = url.searchParams.get("timeout");
    const path = url.pathname;
    const uniqId = Date.now();
    if (!(path in getQueue)) {
        console.log(`no ${path} in getQueue`);
        getQueue[path] = [uniqId];
        console.log(getQueue);
    } else {
        getQueue[path].push(uniqId);
        console.log(getQueue);
    }
    console.log(keyV * 1000);
    let counter = 0;;
    const interval = setInterval( function() {
        // console.log('Bar', counter);
        if (uniqId == getQueue[path][0]) {
            if (path in putQueue) {
                console.log(`found ${path} in putQueue`);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain');
                res.end(`${putQueue[path].shift()}`);
                if (putQueue[path].length == 0) {
                    delete putQueue[path];
                }
                getQueue[path].shift()
                if (getQueue[path].length == 0) {
                    delete getQueue[path];
                }
                clearInterval(interval);
            }
            
            // testArg--
            
        }
        counter++;
        if (counter >= keyV*10) {
            const rem = getQueue[path].indexOf(uniqId)
            getQueue[path].splice(rem, 1)
            console.log(`deleted ${uniqId} from ${path}getQueue`);
            if (getQueue[path].length == 0) {
                delete getQueue[path];
            }
            console.log(getQueue);
            res.statusCode = 404;
            res.end();
            clearInterval(interval);
        }
    }, 100);
    // res.statusCode = 200;
    // res.setHeader('Content-Type', 'text/plain');
    // res.end(`GET ${req.url}`);
});

myEmitter.on('PUT', (req, res) => {
    const url = new URL(req.url, `http://${hostname}/${req.url}`);
    const keyV = url.searchParams.get("v");
    const path = url.pathname;
            if (keyV == null) {
                res.statusCode = 400;
                res.end();
                return
            }
            if (keyV.length < 1) {
                res.statusCode = 400;
                res.end();
                return
            } else {
                res.statusCode = 200;
                // testArg++
                if (!(path in putQueue)) {
                    console.log(`no ${path} in putQueue`);
                    putQueue[path] = [keyV];
                    console.log(putQueue);
                } else {
                    putQueue[path].push(keyV);
                    console.log(putQueue);
                }
                // let waitTill = new Date(new Date().getTime() + 3 * 1000);
                // while(waitTill > new Date()){}
                res.setHeader('Content-Type', 'text/plain');
                res.end(`PUT ${url.searchParams.get("v")}`);
                return
            }
})
inputArgs.forEach((val, index) => {
    if (val == "-p" && typeof(inputArgs[index+1]) != "undefined") {
        port = inputArgs[index+1];
    }
  });

const server = http.createServer((req, res) => {
    // console.log(req.method); 
    switch (req.method) {
        case "GET": 
            myEmitter.emit('GET', req, res);
            break;
        case "PUT":
            myEmitter.emit('PUT', req, res);
            break;
        default:
            res.statusCode = 400;
            break;
    }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
console.log(myEmitter.eventNames());
console.log(myEmitter.getMaxListeners());