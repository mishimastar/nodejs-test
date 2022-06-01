import * as http from 'http';

const hostname: string = '127.0.0.1';
let port: number = 80;
const inputArgs: string[] = process.argv;
let getCounter: number = 0;

inputArgs.forEach((val, index) => {
    if (val == "-p" && typeof(inputArgs[index+1]) != "undefined") {
        port = Number(inputArgs[index+1]);
    }
  });


class PutQueue {
    _queue: Map<string, string[]>;
    constructor() {
        this._queue = new Map();
    }
    pathInQueue(path: string): boolean {
        return this._queue.has(path) 
    }
    addRequestToQueue(path: string, request: string) {
        if (!(this._queue.has(path))) {
            this._queue.set(path, [request]);
        } else {
            let buf: string[] = this._queue.get(path)
            buf.push(request)
            this._queue.set(path, buf);
        }
    }
    getFirstFromQueue(path: string): string {
        let buf: string[] = this._queue.get(path);
        const result: string = buf.shift();
        if (buf.length == 0) {
            this._queue.delete(path);
        } else {
            this._queue.set(path, buf)
        }
        return result
    }
}

class GetQueue extends PutQueue {
    getFirstFromQueue(path: string) {
        return this._queue.get(path)[0]
    }
    remRequestFromQueue(path: string, request: string, reason: string) {
        let buf: string[] = this._queue.get(path);
        switch(reason) {
            case "timeout":
                const rem: number = buf.indexOf(request);
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

function ProcessGet(req: http.IncomingMessage, res: http.ServerResponse, uniqId: string) {
    const url: URL = new URL(req.url, `http://${hostname}/${req.url}`);
    const keyTimeout: number = Number(url.searchParams.get("timeout"));
    const path: string = url.pathname;
    getQueue.addRequestToQueue(path, uniqId);
    console.log(getQueue)
    console.log(keyTimeout * 1000);
    let counter: number = 0;
    setTimeout(function wait() {
        if (uniqId == getQueue.getFirstFromQueue(path)) {
            if (putQueue.pathInQueue(path)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain');
                res.end(`${putQueue.getFirstFromQueue(path)}`);
                getQueue.remRequestFromQueue(path, uniqId, "found");
                console.log(getQueue);
                return
            }
        }
        counter++;
        if (counter >= keyTimeout * 10) {
            getQueue.remRequestFromQueue(path, uniqId, "timeout");
            console.log(getQueue)
            res.statusCode = 404;
            res.end();
            console.log('timeout');
        } else {
            setTimeout(wait, 100)
        }
        
    }, 100);
}

function ProcessPut(req: http.IncomingMessage, res: http.ServerResponse) {
    const url: URL = new URL(req.url, `http://${hostname}/${req.url}`);
    const keyV: string = url.searchParams.get("v");
    const path: string = url.pathname;
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

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    switch (req.method) {
        case "GET": 
            const getId: string = String(getCounter);
            getCounter++;
            ProcessGet(req, res, getId);
            break;
        case "PUT":
            ProcessPut(req, res);
            break;
        default:
            res.statusCode = 400;
            res.end();
            break;
    }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
