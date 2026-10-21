import {Link} from "../app/navigation";
import {GameCard} from "../components/GameCard";
import {GAMES} from "../games/registry";
export function HomePage() {
  return <main className="site-container home-page">
    <section className="hero">
      <div className="hero-copy">
        <span className="kicker">MOVE · TOUCH · PLAY</span>
        <h1>몸이 곧 <em>컨트롤러.</em></h1>
        <p>카메라 앞에서 움직이면 게임이 시작돼요. 별도의 기기나 회원가입 없이 몸으로 즐기는 모션 미니게임.</p>
        <div className="hero-actions">
          <Link className="primary hero-primary" to="/play/balloon-pop">▶ 바로 플레이</Link>
          <Link className="secondary hero-secondary" to="/games">게임 둘러보기 →</Link>
          <Link className="secondary hero-secondary" to="/players">2인 인식 테스트 →</Link>
        </div>
        <span className="privacy-note">◉ 카메라 영상은 기기에서만 처리 · 업로드나 녹화 없음</span>
      </div>
      <div className="hero-scene" aria-hidden="true">
        <div className="scene-orbit orbit-one"/><div className="scene-orbit orbit-two"/>
        <div className="scene-balloon balloon-one"/><div className="scene-balloon balloon-two"/>
        <div className="scene-balloon balloon-three"/>
        <svg className="scene-stickman" viewBox="0 0 240 310" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="#a2f7dd" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="120" cy="46" r="25"/><path d="M120 72 L120 180 M120 105 L65 145 L29 105 M120 105 L171 137 L205 88 M120 180 L75 251 L47 279 M120 180 L167 251 L202 281"/>
          </g>
          <g fill="#73efd1" fillOpacity=".22" stroke="#72efd0" strokeWidth="3">
            <circle cx="29" cy="105" r="22"/><circle cx="205" cy="88" r="22"/><circle cx="47" cy="279" r="23"/><circle cx="202" cy="281" r="23"/>
          </g>
        </svg>
      </div>
    </section>
    <section className="section-block">
      <div className="section-heading"><div><span className="kicker">START PLAYING</span><h2>추천 게임</h2></div><Link to="/games" className="see-all">모든 게임 보기 →</Link></div>
      <div className="catalog-grid">{GAMES.slice(0,6).map(game => <GameCard key={game.id} game={game}/>)}</div>
    </section>
    <section className="how-it-works">
      <h2>3단계면 충분해요</h2>
      <div className="steps"><div><b>01</b><strong>게임 선택</strong><p>마음에 드는 게임을 고르세요.</p></div>
        <div><b>02</b><strong>카메라 준비</strong><p>카메라 앞에서 몸이 잘 보이게 서 주세요.</p></div>
        <div><b>03</b><strong>움직여서 플레이</strong><p>손과 발, 온몸으로 게임을 즐기세요.</p></div></div>
    </section>
  </main>;
}
