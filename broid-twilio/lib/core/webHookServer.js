"use strict";
const bodyParser = require("body-parser");
const broid_utils_1 = require("broid-utils");
const EventEmitter = require("eventemitter3");
const express = require("express");
const twilio = require("twilio");
class WebHookServer extends EventEmitter {
    constructor(options, logLevel) {
        super();
        this.host = options && options.host || "127.0.0.1";
        this.port = options && options.port || 8080;
        this.logger = new broid_utils_1.Logger("webhook_server", logLevel || "info");
        this.express = express();
        this.middleware();
        this.routes();
    }
    listen() {
        this.express.listen(this.port, this.host, () => {
            this.logger.info(`Server listening at port ${this.host}:${this.port}...`);
        });
    }
    middleware() {
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: false }));
    }
    routes() {
        const router = express.Router();
        router.post("/", (req, res) => {
            const event = {
                request: req,
                response: res,
            };
            this.emit("message", event);
            const twiml = new twilio.TwimlResponse();
            res.type("text/xml");
            res.send(twiml.toString());
        });
        this.express.use("/", router);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WebHookServer;
