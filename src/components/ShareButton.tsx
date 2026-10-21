import {useState} from "react";
import type {GameDefinition} from "../games/registry";
import {gameSharePayload,resultSharePayload,shareOrCopy} from "../engine/share";

/** Works for any available game; the shared URL is the existing /play/:id route. */
export function ShareButton({game,result,className="secondary"}:{
  game:GameDefinition; result?:{score:number;maxCombo:number}; className?:string
}) {
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  async function handleShare() {
    if(busy)return;
    setNotice("");setBusy(true);
    try {
      const payload=result
        ?resultSharePayload(game,result.score,result.maxCombo,window.location.origin)
        :gameSharePayload(game,window.location.origin);
      const outcome=await shareOrCopy(payload);
      setNotice(outcome==="copied"?"공유 문구와 링크를 복사했어요."
        :outcome==="unavailable"?"공유할 수 없어요. 주소 표시줄의 링크를 복사해 주세요.":"");
    } finally {setBusy(false);}
  }
  return <span className="share-control">
    <button type="button" className={className} onClick={()=>void handleShare()} disabled={busy}
      aria-label={result?"게임 결과 공유":"게임 링크 공유"}>{result?"↗ 결과 공유":"↗ 공유"}</button>
    {notice&&<span className="share-notice" role="status">{notice}</span>}
  </span>;
}
