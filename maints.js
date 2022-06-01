"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var http = require("http");
var hostname = '127.0.0.1';
var port = 80;
var inputArgs = process.argv;
var getCounter = 0;
inputArgs.forEach(function (val, index) {
    if (val == "-p" && typeof (inputArgs[index + 1]) != "undefined") {
        port = Number(inputArgs[index + 1]);
    }
});
var PutQueue = /** @class */ (function () {
    function PutQueue() {
        this._queue = new Map();
    }
    PutQueue.prototype.pathInQueue = function (path) {
        return this._queue.has(path);
    };
    PutQueue.prototype.addRequestToQueue = function (path, request) {
        if (!(this._queue.has(path))) {
            this._queue.set(path, [request]);
        }
        else {
            var buf = this._queue.get(path);
            buf.push(request);
            this._queue.set(path, buf);
        }
    };
    PutQueue.prototype.getFirstFromQueue = function (path) {
        var buf = this._queue.get(path);
        var result = buf.shift();
        if (buf.length == 0) {
            this._queue["delete"](path);
        }
        else {
            this._queue.set(path, buf);
        }
        return result;
    };
    return PutQueue;
}());
var GetQueue = /** @class */ (function (_super) {
    __extends(GetQueue, _super);
    function GetQueue() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GetQueue.prototype.getFirstFromQueue = function (path) {
        return this._queue.get(path)[0];
    };
    GetQueue.prototype.remRequestFromQueue = function (path, request, reason) {
        var buf = this._queue.get(path);
        switch (reason) {
            case "timeout":
                var rem = buf.indexOf(request);
                buf.splice(rem, 1);
                break;
            default:
                buf.shift();
                break;
        }
        if (buf.length == 0) {
            this._queue["delete"](path);
        }
        else {
            this._queue.set(path, buf);
        }
    };
    return GetQueue;
}(PutQueue));
var getQueue = new GetQueue();
var putQueue = new PutQueue();
function ProcessGet(req, res, uniqId) {
    var url = new URL(req.url, "http://".concat(hostname, "/").concat(req.url));
    var keyTimeout = Number(url.searchParams.get("timeout"));
    var path = url.pathname;
    getQueue.addRequestToQueue(path, uniqId);
    console.log(getQueue);
    console.log(keyTimeout * 1000);
    var counter = 0;
    setTimeout(function wait() {
        if (uniqId == getQueue.getFirstFromQueue(path)) {
            if (putQueue.pathInQueue(path)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain');
                res.end("".concat(putQueue.getFirstFromQueue(path)));
                getQueue.remRequestFromQueue(path, uniqId, "found");
                console.log(getQueue);
                return;
            }
        }
        counter++;
        if (counter >= keyTimeout * 10) {
            getQueue.remRequestFromQueue(path, uniqId, "timeout");
            console.log(getQueue);
            res.statusCode = 404;
            res.end();
            console.log('timeout');
        }
        else {
            setTimeout(wait, 100);
        }
    }, 100);
}
function ProcessPut(req, res) {
    var url = new URL(req.url, "http://".concat(hostname, "/").concat(req.url));
    var keyV = url.searchParams.get("v");
    var path = url.pathname;
    if (keyV == null) {
        res.statusCode = 400;
        res.end();
        return;
    }
    if (keyV.length < 1) {
        res.statusCode = 400;
        res.end();
        return;
    }
    else {
        res.statusCode = 200;
        putQueue.addRequestToQueue(path, keyV);
        res.end();
        return;
    }
}
var server = http.createServer(function (req, res) {
    switch (req.method) {
        case "GET":
            var getId = String(getCounter);
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
server.listen(port, hostname, function () {
    console.log("Server running at http://".concat(hostname, ":").concat(port, "/"));
});
