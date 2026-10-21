import test from "node:test";
import assert from "node:assert/strict";
import {gameShareUrl,gameSharePayload,resultSharePayload,shareCopyText,shareOrCopy} from "../src/engine/share.ts";

const game={id:"fruit-catch",title:"과일 바구니",emoji:"🍎",tagline:"떨어지는 과일을 잡아라!"};
test("game shares keep the same playable URL across results and preview origins",()=>{
  const origin="https://sticktouch-preview.example";
  assert.equal(gameShareUrl(origin,game.id),origin+"/play/fruit-catch");
  assert.equal(gameSharePayload(game,origin).url,resultSharePayload(game,2450,18,origin).url);
  assert.equal(gameShareUrl(origin,"id with spaces"),origin+"/play/id%20with%20spaces");
});
test("result shares contain score, combo and the game link, not private camera data",()=>{
  const payload=resultSharePayload(game,2450,18,"https://example.com");
  assert.match(payload.text,/2,450점/);
  assert.match(payload.text,/18×/);
  assert.match(shareCopyText(payload),/https:\/\/example.com\/play\/fruit-catch$/);
});
test("native share takes priority over copying",async()=>{
  let shares=0, copies=0;
  const result=await shareOrCopy(gameSharePayload(game,"https://example.com"),{
    share:async()=>{shares++;},copy:async()=>{copies++;}
  });
  assert.equal(result,"shared");assert.equal(shares,1);assert.equal(copies,0);
});
test("unsupported and failed native share fall back to complete text plus URL",async()=>{
  const payload=resultSharePayload(game,100,4,"https://example.com");
  const copied:string[]=[];
  assert.equal(await shareOrCopy(payload,{copy:async text=>{copied.push(text);}}),"copied");
  assert.equal(await shareOrCopy(payload,{share:async()=>{throw Error("unsupported");},copy:async text=>{copied.push(text);}}),"copied");
  assert.deepEqual(copied,[shareCopyText(payload),shareCopyText(payload)]);
});
test("cancelled share does not unexpectedly copy; denial is reported",async()=>{
  let copied=false;
  const payload=gameSharePayload(game,"https://example.com");
  const error=new Error("cancelled");error.name="AbortError";
  assert.equal(await shareOrCopy(payload,{
    share:async()=>{throw error;},copy:async()=>{copied=true;}
  }),"cancelled");
  assert.equal(copied,false);
  assert.equal(await shareOrCopy(payload,{copy:async()=>{throw Error("clipboard blocked");}}),"unavailable");
});
