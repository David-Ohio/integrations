"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const broid_schemas_1 = require("broid-schemas");
const broid_utils_1 = require("broid-utils");
const uuid = require("node-uuid");
const Rx_1 = require("rxjs/Rx");
const WeChat = require("wechat-api");
const parser_1 = require("./parser");
const webHookServer_1 = require("./webHookServer");
const HTTPOptions = {
    host: "127.0.0.1",
    port: 8080,
};
class Adapter {
    constructor(obj) {
        this.serviceID = obj && obj.serviceID || uuid.v4();
        this.logLevel = obj && obj.logLevel || "info";
        this.appID = obj && obj.appID;
        this.appSecret = obj && obj.appSecret;
        this.HTTPOptions = obj.http || HTTPOptions;
        this.logger = new broid_utils_1.Logger("adapter", this.logLevel);
        if (!this.appID) {
            throw new Error("appID must be set");
        }
        if (!this.appSecret) {
            throw new Error("appSecret must be set");
        }
        this.client = Promise.promisifyAll(new WeChat(this.appID, this.appSecret));
        this.client.setEndpoint("api.wechat.com");
        this.parser = new parser_1.default(this.client, this.serviceID, this.logLevel);
    }
    serviceId() {
        return this.serviceID;
    }
    connect() {
        if (this.connected) {
            return Rx_1.Observable.of({ type: "connected", serviceID: this.serviceId() });
        }
        this.webhookServer = new webHookServer_1.default(this.serviceID, this.HTTPOptions, this.logLevel);
        this.webhookServer.listen();
        this.connected = true;
        return Rx_1.Observable.of(({ type: "connected", serviceID: this.serviceId() }));
    }
    disconnect() {
        this.connected = false;
        return this.webhookServer.close();
    }
    listen() {
        if (!this.webhookServer) {
            return Rx_1.Observable.throw(new Error("No webhookServer found."));
        }
        return Rx_1.Observable.fromEvent(this.webhookServer, "message")
            .mergeMap((event) => this.parser.parse(event))
            .mergeMap((parsed) => this.parser.validate(parsed))
            .mergeMap((validated) => {
            if (!validated) {
                return Rx_1.Observable.empty();
            }
            return Promise.resolve(validated);
        });
    }
    send(data) {
        this.logger.debug("sending", { message: data });
        return broid_schemas_1.default(data, "send")
            .then(() => {
            switch (data.object.type) {
                case "Note":
                    return this.client.sendTextAsync(data.to.id, data.object.content);
                case "Audio":
                case "Image":
                case "Video":
                    return this.client.sendTextAsync(data.to.id, data.object.url);
                default:
                    throw new Error(`${data.object.type} not supported.`);
            }
        })
            .then(() => ({ type: "sent", serviceID: this.serviceId() }));
    }
}
exports.default = Adapter;
