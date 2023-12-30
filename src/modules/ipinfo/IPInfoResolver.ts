import fetch from 'node-fetch';
import { IPInfoDB } from './IPInfoDB.js';


export interface IIPInfo {
  status: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  cityCode?: string;
  locLat?: number;
  locLon?: number;
  zone?: string;
  isp?: string;
  org?: string;
  as?: string;
  proxy?: boolean;
  hosting?: boolean;
}

export class IPInfoResolver {
  private ipInfoDb: IPInfoDB;
  private ipInfoApi: string;
  private ipInfoCache: {[ip: string]: [number, Promise<IIPInfo>]} = {};

  public constructor(ipInfoDb: IPInfoDB, api: string) {
    this.ipInfoDb = ipInfoDb;
    this.ipInfoApi = api;
    setInterval(() => {
      this.cleanIpInfoCache();
    }, 20 * 1000);
  }

  public setApi(api: string) {
    this.ipInfoApi = api;
  }

  public async getIpInfo(ipAddr: string): Promise<IIPInfo> {
    let cachedIpInfo = await this.ipInfoDb.getIPInfo(ipAddr);
    if(cachedIpInfo)
      return Promise.resolve(cachedIpInfo);
    if(this.ipInfoCache.hasOwnProperty(ipAddr))
      return this.ipInfoCache[ipAddr][1];

    let ipApiUrl = this.ipInfoApi.replace(/{ip}/, ipAddr);
    let promise = fetch(ipApiUrl)
    .then((rsp) => rsp.json())
    .then((rsp: any) => {
      if(!rsp || !rsp.status)
        throw "invalid ip info response";
      let ipInfo: IIPInfo = {
        status: rsp.status,
      };
      if(rsp.status === "success") {
        ipInfo.country = rsp.country;
        ipInfo.countryCode = rsp.countryCode;
        ipInfo.region = rsp.regionName;
        ipInfo.regionCode = rsp.region;
        ipInfo.city = rsp.city;
        ipInfo.cityCode = rsp.zip;
        ipInfo.locLat = rsp.lat;
        ipInfo.locLon = rsp.lon;
        ipInfo.zone = rsp.timezone;
        ipInfo.isp = rsp.isp;
        ipInfo.org = rsp.org;
        ipInfo.as = rsp.as;
        ipInfo.proxy = rsp.proxy;
        ipInfo.hosting = rsp.hosting;

        this.ipInfoDb.setIPInfo(ipAddr, ipInfo);
      }
      return ipInfo;
    }, (err) => {
      return {
        status: "error" + (err ? ": " + err.toString() : ""),
      };
    });

    this.ipInfoCache[ipAddr] = [
      Math.floor((new Date()).getTime() / 1000),
      promise,
    ];
    return await promise;
  }

  private cleanIpInfoCache() {
    let now = Math.floor((new Date()).getTime() / 1000);
    Object.keys(this.ipInfoCache).forEach((ipAddr) => {
      if(now - this.ipInfoCache[ipAddr][0] > 6 * 60 * 60) {
        delete this.ipInfoCache[ipAddr];
      }
    });
  }

}
