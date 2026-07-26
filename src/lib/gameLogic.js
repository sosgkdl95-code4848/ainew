import { WEAPONS, ARMORS } from "@/data/gameData";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// 기본 플레이어 초기 상태 생성
export function createInitialPlayerState() {
  return {
    level: 1,
    xp: 0,
    gold: 50,
    totalGoldEarned: 50,
    solvedMathCount: 0,
    monstersDefeated: 0,
    equippedWeaponId: "w_1",
    equippedArmorId: "a_1",
    ownedWeaponIds: ["w_1"],
    ownedArmorIds: ["a_1"],
    defeatedBossIds: [],
    potions: 3,
  };
}

// 플레이어 총 스탯 계산 (기본 스탯 + 장비 스탯)
export function calculatePlayerStats(player) {
  const level = player.level || 1;
  
  // 장착 무기 및 갑옷 찾기
  const weapon = WEAPONS.find((w) => w.id === player.equippedWeaponId) || WEAPONS[0];
  const armor = ARMORS.find((a) => a.id === player.equippedArmorId) || ARMORS[0];

  // 레벨 상승 스탯 계산
  const baseHp = 100 + (level - 1) * 20;
  const baseAtk = 15 + (level - 1) * 4;
  const baseDef = 5 + (level - 1) * 2;

  const maxHp = baseHp + (armor.hpBonus || 0);
  const totalAtk = baseAtk + (weapon.atk || 0);
  const totalDef = baseDef + (armor.def || 0);
  const maxXp = level <= 10 ? level * 20 : level * 60;

  return {
    level,
    maxHp,
    totalAtk,
    totalDef,
    maxXp,
    weapon,
    armor,
  };
}

// 피해량 데미지 공수 계산
export function calculateDamage(atk, def) {
  const rawDamage = atk - def;
  // 최소 1 데미지 보장 + Slight Randomness (±10%)
  const variation = (Math.random() * 0.2 - 0.1) * rawDamage;
  const finalDamage = Math.max(1, Math.round(rawDamage + variation));
  return finalDamage;
}

// Firestore 세이브
export async function saveGameData(uid, playerData) {
  if (!uid) return;
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      ...playerData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log("게임 세이브 완료!");
  } catch (error) {
    console.error("Firestore 세이브 실패:", error);
  }
}

// Firestore 로드
export async function loadGameData(uid) {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error("Firestore 로드 실패:", error);
  }
  return null;
}
