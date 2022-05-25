const http = require('node:http');

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
        this._queue = new Map();
    }
    pathInQueue(path) {
        return this._queue.has(path) 
    }
    addRequestToQueue(path, request) {
        if (!(this._queue.has(path))) {
            // console.log(`no ${path} in queue`);
            this._queue.set(path, [request]);
            // console.log(this._queue);
        } else {
            let buf = this._queue.get(path)
            buf.push(request)
            this._queue.set(path, buf);
            // console.log(this._queue);
        }
    }
    getFirstFromQueue(path) {
        let buf = this._queue.get(path);
        const result = buf.shift();
        // console.log(`get ${result} from ${path} in queue`);
        if (buf.length == 0) {
            this._queue.delete(path);
        } else {
            this._queue.set(path, buf)
        }
        return result
    }
}

class GetQueue extends PutQueue {
    getFirstFromQueue(path) {
        return this._queue.get(path)[0]
    }
    remRequestFromQueue(path, request, reason) {
        let buf = this._queue.get(path);
        switch(reason) {
            case "timeout":
                const rem = buf.indexOf(request);
                buf.splice(rem, 1);
                break;
            default:
                buf.shift()
                break;
        }
        if (buf.length == 0) {
            this._queue.delete(path);
        } else {
            this._queue.set(path, buf)
        }
    }
}

const getQueue = new GetQueue();
const putQueue = new PutQueue();

function ProcessGet(req, res) {
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
                // console.log(`found ${path} in putQueue`);
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
            res.statusCode = 404;
            res.end();
            clearInterval(interval);
        }
    }, 100);
}

function ProcessPut(req, res) {
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
                putQueue.addRequestToQueue(path, keyV)
                res.end();
                return
            }
}

const server = http.createServer((req, res) => {
    switch (req.method) {
        case "GET": 
            ProcessGet(req, res);
            break;
        case "PUT":
            ProcessPut(req, res);
            break;
        default:
            res.statusCode = 400;
            break;
    }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
