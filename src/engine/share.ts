/** Minimal, backend-free sharing. URLs always point to a playable game, never a score page. */
import type {GameDefinition} from "../games/registry";

type ShareGame = Pick<GameDefinition,"id"|"title"|"tagline"|"emoji">;
export type SharePayload = {title:string; text:string; url:string};
export type ShareOutcome = "shared"|"copied"|"cancelled"|"unavailable";
export type ShareApi = {
  share?: (payload:SharePayload)=>Promise<void>;
  copy?: (text:string)=>Promise<void>;
};

/** Use the current deployment origin; never hardcode a production or preview hostname. */
export function gameShareUrl(origin:string, gameId:string):string {
  return new URL(`/play/${encodeURIComponent(gameId)}`,origin).toString();
}
export function gameSharePayload(game:ShareGame, origin:string):SharePayload {
  return {
    title:`${game.title} | StickTouch`,
    text:`${game.emoji} ${game.title}\n${game.tagline}\n같이 플레이해 봐!`,
    url:gameShareUrl(origin,game.id)
  };
}
export function resultSharePayload(game:ShareGame, score:number, maxCombo:number, origin:string):SharePayload {
  return {
    title:`${game.title} 결과 | StickTouch`,
    text:`${game.emoji} ${game.title}에서 ${score.toLocaleString("ko-KR")}점! 🏆\n최고 콤보 ${maxCombo}×\n내 기록에 도전해 봐!`,
    url:gameShareUrl(origin,game.id)
  };
}
export function shareCopyText(payload:SharePayload):string {
  return `${payload.text}\n${payload.url}`;
}
function browserShareApi():ShareApi {
  if(typeof navigator==="undefined")return {};
  return {
    share:typeof navigator.share==="function"?data=>navigator.share(data):undefined,
    copy:typeof navigator.clipboard?.writeText==="function"
      ?value=>navigator.clipboard.writeText(value):undefined
  };
}
/** The native dialog must run directly from a user click; cancelled shares never auto-copy. */
export async function shareOrCopy(payload:SharePayload, api:ShareApi=browserShareApi()):Promise<ShareOutcome> {
  if(api.share) {
    try {await api.share(payload);return "shared";}
    catch(error) {
      if(error instanceof Error && error.name==="AbortError")return "cancelled";
      // Browser sharing unavailable/denied: try plain text clipboard instead.
    }
  }
  if(api.copy) {
    try {await api.copy(shareCopyText(payload));return "copied";}
    catch {/* User may deny clipboard permission. */}
  }
  return "unavailable";
}
