// 무기 데이터 (레벨 5, 10, 15, 20)
export const WEAPONS = [
  { id: "w_1", name: "나무 목검", reqLevel: 1, atk: 5, price: 0, icon: "🗡️", desc: "모험가의 기본 무기" },
  { id: "w_5", name: "강철 장검", reqLevel: 5, atk: 15, price: 150, icon: "⚔️", desc: "묵직한 강철로 제련된 검" },
  { id: "w_10", name: "기사의 대검", reqLevel: 10, atk: 35, price: 500, icon: "🗡️✨", desc: "왕국 기사단이 사용하던 명검" },
  { id: "w_15", name: "화염 카타나", reqLevel: 15, atk: 65, price: 1500, icon: "🔥⚔️", desc: "불꽃의 정령 기운이 깃든 검" },
  { id: "w_20", name: "드래곤 슬레이어", reqLevel: 20, atk: 110, price: 4000, icon: "🐉⚔️", desc: "드래곤의 비늘마저 벨 수 있는 전설의 무기" },
];

// 갑옷 데이터 (레벨 5, 10, 15, 20)
export const ARMORS = [
  { id: "a_1", name: "천 옷", reqLevel: 1, def: 5, hpBonus: 20, price: 0, icon: "🥋", desc: "기본적인 천 옷" },
  { id: "a_5", name: "가죽 갑옷", reqLevel: 5, def: 15, hpBonus: 60, price: 150, icon: "🛡️", desc: "질긴 가죽으로 만든 갑옷" },
  { id: "a_10", name: "플레이트 아머", reqLevel: 10, def: 30, hpBonus: 120, price: 500, icon: "🏰🛡️", desc: "단단한 철판으로 둘러싸인 갑옷" },
  { id: "a_15", name: "미스릴 아머", reqLevel: 15, def: 50, hpBonus: 200, price: 1500, icon: "✨🛡️", desc: "가볍고 신비로운 금속 미스릴 갑옷" },
  { id: "a_20", name: "용비늘 갑옷", reqLevel: 20, def: 80, hpBonus: 350, price: 4000, icon: "🐉🛡️", desc: "드래곤의 비늘로 만들어진 최고급 갑옷" },
];

// 사냥터 및 미니 몬스터 데이터 (미니 몬스터: 7타에 사망 / 플레이어 10타 버팀 밸런싱)
export const HUNTING_GROUNDS = [
  {
    id: "zone_1",
    name: "초심자의 숲 (Lv.1 ~ 5)",
    reqLevel: 1,
    monsters: [
      { id: "m_1", name: "말랑 슬라임", hp: 88, maxHp: 88, atk: 15, def: 2, goldReward: 25, xpReward: 30, icon: "🟢" },
      { id: "m_2", name: "야생 멧돼지", hp: 140, maxHp: 140, atk: 25, def: 3, goldReward: 35, xpReward: 45, icon: "🐗" },
    ],
  },
  {
    id: "zone_2",
    name: "어둠의 동굴 (Lv.6 ~ 10)",
    reqLevel: 6,
    monsters: [
      { id: "m_3", name: "고블린 정찰병", hp: 343, maxHp: 343, atk: 58, def: 6, goldReward: 65, xpReward: 80, icon: "👺" },
      { id: "m_4", name: "해골 전사", hp: 380, maxHp: 380, atk: 64, def: 8, goldReward: 90, xpReward: 110, icon: "💀" },
    ],
  },
  {
    id: "zone_3",
    name: "황량한 황무지 (Lv.11 ~ 15)",
    reqLevel: 11,
    monsters: [
      { id: "m_5", name: "오크 버서커", hp: 595, maxHp: 595, atk: 99, def: 10, goldReward: 150, xpReward: 180, icon: "👹" },
      { id: "m_6", name: "다크 위저드", hp: 640, maxHp: 640, atk: 110, def: 12, goldReward: 220, xpReward: 260, icon: "🧙‍♂️" },
    ],
  },
  {
    id: "zone_4",
    name: "심연의 틈새 (Lv.16 ~ 20)",
    reqLevel: 16,
    monsters: [
      { id: "m_7", name: "헬하운드", hp: 910, maxHp: 910, atk: 149, def: 15, goldReward: 380, xpReward: 450, icon: "🐺🔥" },
      { id: "m_8", name: "그림자 기사", hp: 1000, maxHp: 1000, atk: 165, def: 18, goldReward: 550, xpReward: 650, icon: "👤⚔️" },
    ],
  },
];

// 보스 데이터 (레벨 10, 15, 20 - 7타에 사망 / 플레이어 4타 버팀 밸런싱)
export const BOSSES = [
  {
    id: "boss_10",
    name: "고블린 국왕",
    reqLevel: 10,
    hp: 600,
    maxHp: 600,
    atk: 140,
    def: 10,
    icon: "👑👺",
    rewardGold: 1000,
    rewardXp: 800,
    desc: "레벨 10 달성 시 도전 가능! 7회 이상 공격해야 처치 가능합니다.",
  },
  {
    id: "boss_15",
    name: "서리 드래곤",
    reqLevel: 15,
    hp: 920,
    maxHp: 920,
    atk: 210,
    def: 20,
    icon: "❄️🐉",
    rewardGold: 3000,
    rewardXp: 2000,
    desc: "레벨 15 달성 시 도전 가능! 강력한 브레스로 플레이어를 압박합니다.",
  },
  {
    id: "boss_20",
    name: "심연의 마왕",
    reqLevel: 20,
    hp: 1360,
    maxHp: 1360,
    atk: 305,
    def: 30,
    icon: "👿🔥",
    rewardGold: 10000,
    rewardXp: 5000,
    desc: "최종 레벨 20 보스! 세상의 멸망을 노리는 절대악입니다.",
  },
];
