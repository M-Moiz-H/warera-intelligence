import {env} from "../config/env.js";
export class TrpcClient{
 constructor(private base=env.wareraApiBaseUrl,private apiKey=env.wareraApiKey){}
 async get<T>(procedure:string,input?:unknown):Promise<T>{
  const url=new URL(`${this.base.replace(/\/$/,"")}\/procedure}`);
  if(input!==undefined)url.searchParams.set("input",JSON.stringify(input));
  const headers:Record<string,string>={"accept":"application/json"};
  if(this.apiKey)headers["X-API-Key"]=this.apiKey;
  const r=await fetch(url,{headers});
  if(!r.ok)throw new Error(`${procedure}: ${r.status} ${r.statusText}`);
  const body=await r.json();
  return this.unwrap(body) as T;
 }
 private unwrap(body:any){
  if(body?.result?.data?.json!==undefined)return body.result.data.json;
  if(body?.result?.data!==undefined)return body.result.data;
  return body}
}