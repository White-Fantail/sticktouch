import {useState} from "react";
import {GameCard} from "../components/GameCard";
import {CATEGORY_LABELS, GAMES, type GameCategory} from "../games/registry";
type Filter = GameCategory | "all";
export function GamesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Filter>("all");
  const games = GAMES.filter(game => (category === "all" || game.category === category) &&
    `${game.title} ${game.tagline} ${game.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <main className="site-container list-page">
    <div className="page-intro"><span className="kicker">EXPLORE GAMES</span><h1>게임 탐색</h1><p>원하는 게임을 골라 몸으로 즐겨 보세요.</p></div>
    <section className="catalog-filter" aria-label="게임 검색 및 필터">
      <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="게임 검색" placeholder="게임 이름이나 설명 검색" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <div className="filter-chips" aria-label="게임 카테고리">
        {(["all", "touch", "catch", "pose", "dodge", "move", "physics"] as const).map(id =>
          <button key={id} type="button" className={category === id ? "chip active" : "chip"} aria-pressed={category === id} onClick={()=>setCategory(id)}>
            {id === "all" ? "전체" : CATEGORY_LABELS[id]}</button>)}
      </div>
    </section>
    <div className="section-heading"><h2>전체 게임 <span className="count">{games.length}</span></h2></div>
    {games.length ? <div className="catalog-grid">{games.map(game => <GameCard key={game.id} game={game}/>)}</div> :
      <div className="empty-catalog">검색 결과가 없어요. 다른 검색어 또는 카테고리를 선택해 보세요.</div>}
  </main>;
}
