import * as bodyParser from "body-parser";
import { Logger } from "broid-utils";
import * as crypto from "crypto";
import * as EventEmitter from "events";
import * as express from "express";
import * as xmlParser from "express-xml-bodyparser";
import * as R from "ramda";

import { IAdapterHTTPOptions } from "./interfaces";

export default class WebHookServer extends EventEmitter {
  private express: express.Application;
  private router: express.Router;
  private logger: Logger;
  private host: string;
  private port: number;
  private token: string;

  // Run configuration methods on the Express instance.
  constructor(token: string, options?: IAdapterHTTPOptions, logLevel?: string) {
    super();
    this.host = options && options.host || "127.0.0.1";
    this.port = options && options.port || 8080;
    this.token = token;
    this.logger = new Logger("webhook_server", logLevel || "info");

    this.setupExpress();
  }

  public listen() {
    this.httpClient = this.express.listen(this.port, this.host, () => {
      this.logger.info(`Server listening on port ${this.host}:${this.port}...`);
    });
  }

  public close(): Promise<null> {
    return Promise.fromCallback((cb) => this.httpClient.close(cb));
  }

  private setupExpress() {
    this.express = express();
    this.router = express.Router();
    this.express.use(bodyParser.urlencoded({ extended: false }));
    this.express.use(xmlParser());

    this.router.get("/", (req, res) => {
      const shasum = crypto.createHash("sha1");
      shasum.update([this.token, req.query.timestamp, req.query.nonce].sort().join(""));
      const signature = shasum.digest("hex");

      if (signature !== req.query.signature) {
        return res.status(500).end();
      }
      res.status(200).send(req.query.echostr);
    });

    this.router.post("/", (req, res) => {
      // TODO: See if we'll need to do username verification here or not.
      this.emit("message", req.body.xml);
      res.status(200).end();
    });

    this.express.use(this.router);
  }
 }
