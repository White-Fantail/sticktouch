import {Link} from "../app/navigation";
import {ShareButton} from "./ShareButton";
import {CATEGORY_LABELS, type GameDefinition} from "../games/registry";
export function GameCard({game}: {game: GameDefinition}) {
  const available = game.status === "available";
  return <article className="catalog-card">
    <div className={`game-art game-art--${game.artwork}`} aria-hidden="true">
      <span className="game-art-emoji">{game.emoji}</span>
      {game.artwork === "balloons" && <><i/><i/><i/></>}
    </div>
    <div className="catalog-card-content">
      <div className="card-info"><span>{CATEGORY_LABELS[game.category]}</span><span>{game.duration}</span></div>
      <h3>{game.title}</h3><p>{game.tagline}</p>
      <div className="catalog-card-bottom">
        <span className={available ? "availability good" : "availability"}>{available ? "● 플레이 가능" : "○ 준비 중"}</span>
        {available ? <div className="card-share-actions">
            <ShareButton game={game} className="card-share-button"/>
            <Link className="card-play-link" to={`/play/${game.id}`}>플레이 →</Link>
          </div> : <span className="card-coming">출시 예정</span>}
      </div>
    </div>
  </article>;
}
