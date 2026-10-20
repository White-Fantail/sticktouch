import {useEffect} from "react";
import {Link,usePathname} from "./navigation";
import {SettingsProvider} from "../settings/SettingsContext";
import {HomePage} from "../pages/HomePage";
import {GamesPage} from "../pages/GamesPage";
import {SettingsPage} from "../pages/SettingsPage";
import {GameStage} from "../components/GameStage";
import {getGame} from "../games/registry";

function PageRouter() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  useEffect(() => {document.title = pathname === "/" ? "StickTouch — Your body is the controller" :
    pathname === "/games" ? "게임 탐색 | StickTouch" :
    pathname === "/settings" ? "설정 | StickTouch" : "게임 플레이 | StickTouch";}, [pathname]);
  const gameId = pathname.startsWith("/play/") ? pathname.slice("/play/".length) : "";
  const game = getGame(gameId);
  if (gameId && game?.status === "available") return <GameStage key={gameId} game={game}/>;
  const page = pathname === "/" ? <HomePage/> : pathname === "/games" ? <GamesPage/> :
    pathname === "/settings" ? <SettingsPage/> :
    <main className="site-container not-found"><h1>페이지를 찾을 수 없어요</h1><p>게임을 선택하거나 홈으로 돌아가 주세요.</p><Link className="primary" to="/games">게임 둘러보기 →</Link></main>;
  return <div className="site-shell">
    <header className="site-header"><div className="site-container site-header-inner">
      <Link to="/" className="brand"><span className="brand-mark">✳</span> StickTouch</Link>
      <nav className="main-nav" aria-label="주 메뉴">
        <Link to="/" aria-current={pathname==="/ " ? undefined : pathname==="/"?"page":undefined}>홈</Link>
        <Link to="/games" aria-current={pathname==="/games"?"page":undefined}>게임 탐색</Link>
        <Link to="/settings" aria-current={pathname==="/settings"?"page":undefined}>⚙ <span>설정</span></Link>
      </nav></div></header>
    {page}
    <footer className="site-footer">© StickTouch · Your body is the controller · 카메라 영상은 기기 안에서 처리됩니다.</footer>
  </div>;
}
export function App() {return <SettingsProvider><PageRouter/></SettingsProvider>;}
