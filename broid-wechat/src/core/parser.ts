import * as Promise from "bluebird";
import broidSchemas, { IActivityStream, IASObject } from "broid-schemas";
import { cleanNulls, Logger } from "broid-utils";
import * as uuid from "node-uuid";
import * as R from "ramda";

import { IActivityStream } from "./interfaces";

export default class Parser {
  // TODO Sort
  public serviceID: string;
  public generatorName: string;
  private logger: Logger;
  private username: string;
  private wechatClient: any;

  constructor(username: string, wechatClient: any, serviceID: string, logLevel: string) {
    this.serviceID = serviceID;
    this.generatorName = "wechat";
    this.username = username;
    this.logger = new Logger("parser", logLevel);
    this.wechatClient = wechatClient;
  }

  // Validate parsed data with Broid schema validator
  public validate(event: Object | null): Promise<Object | null> {
    this.logger.debug("Validation process", { event });

    const parsed = cleanNulls(event);
    if (!parsed || R.isEmpty(parsed)) { return Promise.resolve(null); }

    if (!parsed.type) {
      this.logger.debug("Type not found.", { parsed });
      return Promise.resolve(null);
    }

    return broidSchemas(parsed, "activity")
      .return(parsed)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
  }

  // Convert normalized data to Broid schema
  public parse(event: Object | null): Promise<IActivityStream | null> {
    this.logger.debug("Normalized process");

    const normalized = cleanNulls(event);
    if (!normalized || R.isEmpty(normalized)) { return Promise.resolve(null); }

    switch (normalized.msgtype[0]) {
      case "image":
        return this.parseImage(normalized);
      case "text":
        return this.parseText(normalized);
      case "video":
        return this.parseMultiMedia(normalized, "video");
      case "voice":
        return this.parseMultiMedia(normalized, "audio");
      default:
        return Promise.resolve(null);
    }
  }

  private createActivityStream(normalized: any): IActivityStream {
    const message: IActivityStream = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "actor": {
        id: normalized.fromusername[0],
        name: normalized.fromusername[0],
        type: "Person",
      },
      "generator": {
        id: this.serviceID,
        name: this.generatorName,
        type: "Service",
      },
      "object": {},
      "published": parseInt(normalized.createtime[0], 10),
      "target": {
        id: normalized.tousername[0],
        name: normalized.tousername[0], // TODO Name not here
        type: "Person", // TODO Test
      },
      "type": "Create",
    };

    return message;
  }

  private parseImage(normalized: any): Promise<IActivityStream> {
    const message: IActivityStream = this.createActivityStream(normalized);
    const messageObject: IASObject = {
      id: normalized.msgid[0],
      type: "Image",
      url: normalized.picurl[0],
    };
    message.object = messageObject;

    return Promise.resolve(message);
  }

  private parseText(normalized: any): Promise<IActivityStream> {
    const message: IActivityStream = this.createActivityStream(normalized);
    const messageObject: IASObject = {
      content: normalized.content[0],
      id: normalized.msgid[0],
      type: "Note",
    };
    message.object = messageObject;

    return Promise.resolve(message);
  }

  private parseMultiMedia(normalized: any, messageType: string): Promise<IActivityStream> {
   return this.wechatClient.getLatestTokenAsync()
      .then(({accessToken}) => {
        const message: IActivityStream = this.createActivityStream(normalized);
        const messageObject: IASObject = {
          id: normalized.msgid[0],
          type: messageType,
          url: `http://file.api.wechat.com/cgi-bin/media/get?access_token=${accessToken}&media_id=${normalized.mediaid[0]}`,
        };
        message.object = messageObject;

        return message;
      });
  }
}
