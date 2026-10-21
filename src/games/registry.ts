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
  {id:"balloon-pop", title:"버블 헌터", tagline:"색깔이 알려 주는 신체 부위로!",
   description:"색상 규칙에 맞춰 손·발·머리로 버블을 터뜨리세요. 잘못된 부위로 터치하면 점수가 나지 않아요.",
   category:"touch", status:"available", duration:"30초", bodyParts:"손 · 발 · 머리",
   artwork:"balloons", emoji:"🎈", feedback:{musicTheme:"pop"}},
  {id:"fruit-catch", title:"과일 바구니", tagline:"떨어지는 과일을 잡아라!",
   description:"하단 카메라에 비친 손으로 바구니를 움직여 과일을 받고, 폭탄은 피하세요.",
   category:"catch", status:"available", duration:"30초", bodyParts:"양손",
   artwork:"fruit", emoji:"🍎", feedback:{musicTheme:"fruit"}},
  {id:"pose-challenge", title:"댄스 미러", tagline:"거울 속 안무를 박자에 맞춰!",
   description:"연속으로 바뀌는 춤 동작을 거울처럼 따라 해 보세요. 박자마다 자세를 완성하면 콤보가 올라갑니다.",
   category:"pose", status:"available", duration:"30초", bodyParts:"온몸",
   artwork:"pose", emoji:"🕺", feedback:{musicTheme:"rhythm"}},
  {id:"mole-whack",title:"두더지 잡기",tagline:"두더지가 쏙! 빠르게 터치!",
   description:"아홉 개 구멍에서 튀어나오는 두더지를 손바닥으로 잡아보세요.",
   category:"touch",status:"available",duration:"30초",bodyParts:"양손",
   artwork:"mole",emoji:"🐹",feedback:{musicTheme:"pop"}},
  {id:"color-match",title:"색깔 맞히기",tagline:"불러주는 색을 찾아라!",
   description:"화면에 표시된 색을 보고 빨강·파랑·노랑 중 정답을 손으로 터치하세요.",
   category:"touch",status:"available",duration:"30초",bodyParts:"양손",
   artwork:"color",emoji:"🎨",feedback:{musicTheme:"rhythm"}},
  {id:"star-hunt",title:"별 사냥",tagline:"반짝이는 별을 잡아라!",
   description:"이리저리 움직이는 별을 손으로 잡아 콤보를 이어가세요.",
   category:"touch",status:"available",duration:"30초",bodyParts:"양손",
   artwork:"star",emoji:"⭐",feedback:{musicTheme:"fruit"}},
  {id:"meteor-dodge",title:"운석 소나기",tagline:"피하고 두 손으로 부숴라!",
   description:"쏟아지는 운석을 피하거나 손으로 부수세요. 커다란 운석은 두 손을 함께 사용해야 합니다.",
   category:"dodge",status:"available",duration:"30초",bodyParts:"손 · 머리 · 발",
   artwork:"meteor",emoji:"☄️",feedback:{musicTheme:"pop"}},
  {id:"freeze-dance",title:"프리즈 비트",tagline:"음악이 멈추면 얼음!",
   description:"음악의 박자에 맞춰 온몸으로 춤추다가 STOP 박자에는 몸 전체를 멈추세요.",
   category:"move",status:"available",duration:"30초",bodyParts:"온몸",
   artwork:"freeze",emoji:"🧊",feedback:{musicTheme:"rhythm"}},
  {id:"rhythm-pads",title:"바디 비트",tagline:"양손과 양발로 리듬을!",
   description:"손·발 네 부위에 각각 떨어지는 리듬 노트를 맞춰보세요. 손만 사용해서는 완주할 수 없어요.",
   category:"pose",status:"available",duration:"30초",bodyParts:"양손 · 양발",
   artwork:"color",emoji:"🥁",feedback:{musicTheme:"rhythm"}},
  {id:"shield-guard",title:"매직 실드",tagline:"팔을 돌려 공격을 반사!",
   description:"공격 방향에 직각으로 팔을 들어 실드를 만들고 에너지 탄환을 반사하세요.",
   category:"dodge",status:"available",duration:"30초",bodyParts:"양팔",
   artwork:"meteor",emoji:"🛡️",feedback:{musicTheme:"pop"}},
  {id:"memory-sequence",title:"몸으로 암호 풀기",tagline:"자세 순서를 기억하고 따라!",
   description:"화면에 차례로 나타나는 전신 자세를 외운 다음 같은 순서로 직접 재현하세요.",
   category:"touch",status:"available",duration:"30초",bodyParts:"온몸",
   artwork:"color",emoji:"🧠",feedback:{musicTheme:"rhythm"}},
  {id:"laser-lane",title:"레이저 탈출",tagline:"숙이고 기울여 레이저를 통과!",
   description:"전신을 숙이거나 좌우로 기울여 레이저를 피하세요. 손만 안전해도 몸이 닿으면 실패합니다.",
   category:"dodge",status:"available",duration:"30초",bodyParts:"온몸",
   artwork:"meteor",emoji:"⚡",feedback:{musicTheme:"pop"}},
  {id:"parcel-sort",title:"택배 분류",tagline:"잡아서 같은 색 상자로!",
   description:"손으로 택배를 집어 같은 색 배송함까지 움직여 놓으세요.",
   category:"move",status:"available",duration:"30초",bodyParts:"양손",
   artwork:"fruit",emoji:"📦",feedback:{musicTheme:"fruit"}},
  {id:"boss-raid",title:"보스 레이드",tagline:"약점을 공격하고 위험을 피하라!",
   description:"보스의 황금 약점이 열릴 때 터치하고 예고된 붉은 공격은 피하는 페이즈형 배틀입니다.",
   category:"dodge",status:"available",duration:"30초",bodyParts:"양손",
   artwork:"meteor",emoji:"👾",feedback:{musicTheme:"pop"}},
  {id:"gravity-lab",title:"중력 미로",tagline:"손의 높이로 공을 굴려요!",
   description:"양손의 높이 차로 공을 기울여 미로와 움직이는 위험물을 피해 목표에 도달하세요.",
   category:"move",status:"available",duration:"30초",bodyParts:"양손",
   artwork:"fruit",emoji:"🧲",feedback:{musicTheme:"fruit"}},
  {id:"shadow-sync",title:"그림자 싱크",tagline:"움직이는 그림자와 하나가 되세요!",
   description:"두 목표가 움직이는 궤적을 보고, 양손을 함께 맞춰 정확한 타이밍에 유지해요.",
   category:"pose",status:"available",duration:"30초",bodyParts:"양손",
   artwork:"pose",emoji:"🪞",feedback:{musicTheme:"rhythm"}},
  {id:"constellation-trace",title:"별자리 제작자",tagline:"온몸으로 우주의 별을 잇자!",
   description:"별마다 지정된 손·발·머리 부위로 위치를 맞춰 별자리를 완성하세요. 방향도 계속 달라집니다.",
   category:"move",status:"available",duration:"30초",bodyParts:"손 · 발 · 머리",
   artwork:"star",emoji:"🌌",feedback:{musicTheme:"fruit"}},
  {id:"dual-portals",title:"듀얼 포털",tagline:"두 손으로 차원을 연결하세요!",
   description:"움직이는 두 포털에 양손을 동시에 유지해 에너지 전송을 성공시키세요.",
   category:"pose",status:"available",duration:"30초",bodyParts:"양손",
   artwork:"color",emoji:"🌀",feedback:{musicTheme:"rhythm"}}
] as const;
export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find(game => game.id === id);
}
export const CATEGORY_LABELS: Record<GameCategory, string> = {
  touch:"터치", catch:"받기", pose:"리듬 / 포즈", dodge:"회피", move:"움직이기"
};
