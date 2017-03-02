export interface IAdapterOptions {
  address: string;
  username: string;
  channels: string[];
  serviceID?: string;
  logLevel?: string;
  connectTimeout?: number;
}

export interface IAdapterHTTPOptions {
  host: string;
  port: number;
}

