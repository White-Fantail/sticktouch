import type {GameFeelProfile} from "../engine/game-feel";
import type {MusicTheme} from "../engine/audio";
export type GameCategory = "touch" | "catch" | "pose" | "dodge" | "move";
export type GameStatus = "available" | "coming-soon";
export interface GameDefinition {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: GameCategory;
  status: GameStatus;
  duration: string;
  bodyParts: string;
  artwork: string;
  emoji: string;
  /** Shared platform feedback theme and optional per-game scoring profile. */
  feedback: {musicTheme: MusicTheme; scoreProfile?:GameFeelProfile};
}
export const GAMES: readonly GameDefinition[] = [
  {id:"balloon-pop", title:"풍선 터뜨리기", tagline:"온몸으로 팡팡!",
   description:"화면에 나타나는 풍선을 손·발·머리로 터뜨려 점수를 획득하세요.",
   category:"touch", status:"available", duration:"60초", bodyParts:"손 · 발 · 머리",
   artwork:"balloons", emoji:"🎈", feedback:{musicTheme:"pop"}},
  {id:"fruit-catch", title:"과일 바구니", tagline:"떨어지는 과일을 잡아라!",
   description:"하단 카메라에 비친 손으로 바구니를 움직여 과일을 받고, 폭탄은 피하세요.",
   category:"catch", status:"available", duration:"60초", bodyParts:"양손",
   artwork:"fruit", emoji:"🍎", feedback:{musicTheme:"fruit"}},
  {id:"pose-challenge", title:"포즈 챌린지", tagline:"동작을 따라 해 보세요!",
   description:"다섯 가지 목표 자세를 따라 하고 0.85초 유지해 콤보를 이어 가세요.",
   category:"pose", status:"available", duration:"60초", bodyParts:"온몸",
   artwork:"pose", emoji:"🕺", feedback:{musicTheme:"rhythm"}},
  {id:"mole-whack",title:"두더지 잡기",tagline:"두더지가 쏙! 빠르게 터치!",
   description:"아홉 개 구멍에서 튀어나오는 두더지를 손바닥으로 잡아보세요.",
   category:"touch",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"mole",emoji:"🐹",feedback:{musicTheme:"pop"}},
  {id:"color-match",title:"색깔 맞히기",tagline:"불러주는 색을 찾아라!",
   description:"화면에 표시된 색을 보고 빨강·파랑·노랑 중 정답을 손으로 터치하세요.",
   category:"touch",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"color",emoji:"🎨",feedback:{musicTheme:"rhythm"}},
  {id:"star-hunt",title:"별 사냥",tagline:"반짝이는 별을 잡아라!",
   description:"이리저리 움직이는 별을 손으로 잡아 콤보를 이어가세요.",
   category:"touch",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"star",emoji:"⭐",feedback:{musicTheme:"fruit"}},
  {id:"meteor-dodge",title:"운석 피하기",tagline:"조심! 양쪽에서 운석이!",
   description:"좌우로 날아오는 운석을 손으로 피하면 득점합니다.",
   category:"dodge",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"meteor",emoji:"☄️",feedback:{musicTheme:"pop"}},
  {id:"freeze-dance",title:"얼음땡",tagline:"움직여! 그리고 멈춰!",
   description:"초록 불일 때 손을 움직이고 빨간 불에서는 멈추는 반응 게임입니다.",
   category:"move",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"freeze",emoji:"🧊",feedback:{musicTheme:"rhythm"}},
  {id:"rhythm-pads",title:"리듬 패드",tagline:"딱 맞는 순간에 터치!",
   description:"4개 레인으로 떨어지는 노트를 박자에 맞춰 손으로 터치하세요. PERFECT 타이밍을 노려보세요.",
   category:"pose",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"color",emoji:"🥁",feedback:{musicTheme:"rhythm"}},
  {id:"shield-guard",title:"에너지 실드",tagline:"중앙 코어를 보호해요!",
   description:"사방에서 코어로 날아오는 에너지 구슬을 양손으로 막아 콤보를 이어가세요.",
   category:"dodge",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"meteor",emoji:"🛡️",feedback:{musicTheme:"pop"}},
  {id:"memory-sequence",title:"기억력 패턴",tagline:"순서를 보고 기억하세요!",
   description:"깜빡이는 4가지 색상의 순서를 기억한 뒤 손바닥으로 차례차례 눌러보세요.",
   category:"touch",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"color",emoji:"🧠",feedback:{musicTheme:"rhythm"}},
  {id:"laser-lane",title:"레이저 통로",tagline:"안전한 틈으로 피하세요!",
   description:"예고된 레이저의 안전 통로에 손을 옮겨 충돌 없이 통과하면 득점해요.",
   category:"dodge",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"meteor",emoji:"⚡",feedback:{musicTheme:"pop"}},
  {id:"parcel-sort",title:"택배 분류",tagline:"잡아서 같은 색 상자로!",
   description:"손으로 택배를 집어 같은 색 배송함까지 움직여 놓으세요.",
   category:"move",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"fruit",emoji:"📦",feedback:{musicTheme:"fruit"}}
  {id:"boss-raid",title:"보스 레이드",tagline:"약점을 공격하고 위험을 피하라!",
   description:"보스의 황금 약점이 열릴 때 터치하고 예고된 붉은 공격은 피하는 페이즈형 배틀입니다.",
   category:"dodge",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"meteor",emoji:"👾",feedback:{musicTheme:"pop"}},
  {id:"gravity-lab",title:"중력 미로",tagline:"손의 높이로 공을 굴려요!",
   description:"양손의 높이 차로 공을 기울여 미로와 움직이는 위험물을 피해 목표에 도달하세요.",
   category:"move",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"fruit",emoji:"🧲",feedback:{musicTheme:"fruit"}},
  {id:"shadow-sync",title:"그림자 싱크",tagline:"움직이는 그림자와 하나가 되세요!",
   description:"두 목표가 움직이는 궤적을 보고, 양손을 함께 맞춰 정확한 타이밍에 유지해요.",
   category:"pose",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"pose",emoji:"🪞",feedback:{musicTheme:"rhythm"}},
  {id:"constellation-trace",title:"별자리 그리기",tagline:"우주에 별자리를 연결해요!",
   description:"한 손으로 번호가 있는 다섯 별을 순서대로 이어 아름다운 별자리를 완성하세요.",
   category:"move",status:"available",duration:"60초",bodyParts:"한 손",
   artwork:"star",emoji:"🌌",feedback:{musicTheme:"fruit"}},
  {id:"dual-portals",title:"듀얼 포털",tagline:"두 손으로 차원을 연결하세요!",
   description:"움직이는 두 포털에 양손을 동시에 유지해 에너지 전송을 성공시키세요.",
   category:"pose",status:"available",duration:"60초",bodyParts:"양손",
   artwork:"color",emoji:"🌀",feedback:{musicTheme:"rhythm"}}
] as const;
export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find(game => game.id === id);
}
export const CATEGORY_LABELS: Record<GameCategory, string> = {
  touch:"터치", catch:"받기", pose:"리듬 / 포즈", dodge:"회피", move:"움직이기"
};
