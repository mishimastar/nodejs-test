const http = require('node:http');
const EventEmitter = require('node:events')

const myEmitter = new EventEmitter();

const hostname = '127.0.0.1';
let port = 80;
const inputArgs = process.argv;

inputArgs.forEach((val, index) => {
    if (val == "-p" && typeof(inputArgs[index+1]) != "undefined") {
        port = inputArgs[index+1];
    }
  });


class PutQueue {
    constructor() {
        this._queue = {};
    }
    pathInQueue(path) {
        if (path in this._queue) {
            return true
        } else {
            return false
        }
    }
    addRequestToQueue(path, request) {
        if (!(path in this._queue)) {
            console.log(`no ${path} in queue`);
            this._queue[path] = [request];
            console.log(this._queue);
        } else {
            this._queue[path].push(request);
            console.log(this._queue);
        }
    }
    getFirstFromQueue(path) {
        const result = this._queue[path].shift();
        console.log(`get ${result} from ${path} in queue`);
        if (this._queue[path].length == 0) {
            delete this._queue[path];
        }
        return result
    }
}

class GetQueue extends PutQueue {
    getFirstFromQueue(path) {
        return this._queue[path][0]
    }
    remRequestFromQueue(path, request, reason) {
        switch(reason) {
            case "timeout":
                const rem = this._queue[path].indexOf(request);
                this._queue[path].splice(rem, 1);
                console.log(`deleted ${request} from ${path} Queue`);
                if (this._queue[path].length == 0) {
                    delete this._queue[path];
                }
                break;
            default:
                this._queue[path].shift()
                if (this._queue[path].length == 0) {
                    delete this._queue[path];
                }
                break;
        }
    }
}

const getQueue = new GetQueue();
const putQueue = new PutQueue();
myEmitter.setMaxListeners(Infinity)

myEmitter.on('GET', (req, res) => {
    const url = new URL(req.url, `http://${hostname}/${req.url}`);
    const keyTimeout = url.searchParams.get("timeout");
    const path = url.pathname;
    const uniqId = Date.now();
    getQueue.addRequestToQueue(path, uniqId);
    console.log(keyTimeout * 1000);
    let counter = 0;
    const interval = setInterval( function() {
        // console.log('Bar', counter);
        if (uniqId == getQueue.getFirstFromQueue(path)) {
            if (putQueue.pathInQueue(path)) {
                console.log(`found ${path} in putQueue`);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain');
                res.end(`${putQueue.getFirstFromQueue(path)}`);
                getQueue.remRequestFromQueue(path, uniqId);
                clearInterval(interval);
            }
        }
        counter++;
        if (counter >= keyTimeout * 10) {
            getQueue.remRequestFromQueue(path, uniqId, "timeout");
            // console.log(getQueue);
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
                putQueue.addRequestToQueue(path, keyV)
                res.end();
                return
            }
})

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