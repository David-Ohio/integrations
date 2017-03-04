import * as Promise from "bluebird";
import broidSchemas, { ISendParameters } from "broid-schemas";
import { Logger } from "broid-utils";
import * as uuid from "node-uuid";
import { Observable } from "rxjs/Rx";
import * as WeChat from "wechat-api";

import { IAdapterOptions } from "./interfaces";
import Parser from "./parser";
import WebHookServer from "./webHookServer";

export default class Adapter {
  public serviceID: string;

  // TODO: Sort
  private connected: boolean;
  private appID: string;
  private appSecret: string;
  private token: string;
  private client: any;
  private logLevel: string;
  private connectTimeout: number;
  private logger: Logger;
  private parser: Parser;
  private HTTPOptions: IAdapterHTTPOptions;
  private webhookServer: WebHookServer;

  constructor(obj: IAdapterOptions) { // TODO: Update IAdapterOptions
    this.serviceID = obj && obj.serviceID || uuid.v4();
    this.logLevel = obj && obj.logLevel || "info";
    this.connectTimeout = obj && obj.connectTimeout || 60000;
    this.appID = obj && obj.appID;
    this.appSecret = obj && obj.appSecret;
    this.token = obj && obj.token;

    const HTTPOptions: IAdapterHTTPOptions = {
      host: obj && obj.http && obj.http.host,
      port: obj && obj.http && obj.http.port,
    };
    this.HTTPOptions = HTTPOptions;

    this.logger = new Logger("adapter", this.logLevel);

    if (!this.appID) {
      throw new Error("appID must be set");
    }
    if (!this.appSecret) {
      throw new Error("appSecret must be set");
    }
    if (!this.token) {
      throw new Error("token must be set");
    }

    this.client = Promise.promisifyAll(new WeChat(this.appID, this.appSecret));
    this.parser = new Parser(this.username, this.client, this.serviceID, this.logLevel);
  }

  // Return the service ID of the current instance
  public serviceId(): String {
    return this.serviceID;
  }

  public connect(): Observable<Object> {
    if (this.connected) {
      return Observable.of({ type: "connected", serviceID: this.serviceId() });
    }

    this.webhookServer = new WebHookServer(this.token, this.HTTPOptions, this.logLevel);
    this.webhookServer.listen();
    this.connected = true;

    return Observable.of(({ type: "connected", serviceID: this.serviceId() }));
  }

  public disconnect(): Promise<null> {
    return this.webhookServer.close();
  }

  public listen(): Observable<Object> {
    if (!this.webhookServer) {
      return Observable.throw(new Error("No webhookServer found."));
    }

    return Observable.fromEvent(this.webhookServer, "message")
      .map((event: any) => this.parser.parse(event))
      .mergeMap((parsed) => this.parser.validate(parsed))
      .mergeMap((validated) => {
        if (!validated) { return Observable.empty(); }
        return Promise.resolve(validated);
      });
  }

  public send(data: ISendParameters): Promise<Object | Error> {
    this.logger.debug("sending", { message: data });

    return broidSchemas(data, "send")
      .then(() => {
        switch (data.object.type) {
          case "Note":
            return this.client.sendTextAsync(data.to.id, data.object.content);
          case "Audio":
          case "Video":
            return this.client.sendTextAsync(data.to.id, data.object.url);
          default:
            throw new Error(`${data.object.type} not supported.`);
        }
      })
      .then(() => ({ type: "sent", serviceID: this.serviceId() }));
  }
}
