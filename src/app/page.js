"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { WEAPONS, ARMORS, HUNTING_GROUNDS, BOSSES } from "@/data/gameData";
import {
  createInitialPlayerState,
  calculatePlayerStats,
  calculateDamage,
  saveGameData,
  loadGameData,
} from "@/lib/gameLogic";

export default function Home() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Game state
  const [player, setPlayer] = useState(createInitialPlayerState());
  const [activeTab, setActiveTab] = useState("hunt"); // hunt | shop | boss
  const [shopCategory, setShopCategory] = useState("weapons"); // weapons | armors | items

  // Battle state
  const [battle, setBattle] = useState(null); // { target, isBoss, enemyHp, maxEnemyHp, playerHp, logs: [], isOver: false, isWin: false }
  const [saveNotification, setSaveNotification] = useState("");

  // Calculate current stats
  const stats = calculatePlayerStats(player);

  // Auth Listener & Load Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const savedData = await loadGameData(currentUser.uid);
        if (savedData) {
          setPlayer(savedData);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Save game to Firestore & local storage
  const handleSave = async (updatedPlayer = player) => {
    if (user) {
      await saveGameData(user.uid, updatedPlayer);
      setSaveNotification("✅ 데이터가 Firestore에 성공적으로 저장되었습니다!");
    } else {
      setSaveNotification("⚠️ 로그인 상태가 아닙니다.");
    }
    setTimeout(() => setSaveNotification(""), 3000);
  };

  // Level Up Check
  const checkLevelUp = (currentXp, currentLevel, updatedPlayer) => {
    let newXp = currentXp;
    let newLevel = currentLevel;
    let leveledUp = false;

    while (newXp >= newLevel * 60 && newLevel < 20) {
      newXp -= newLevel * 60;
      newLevel += 1;
      leveledUp = true;
    }

    if (leveledUp) {
      alert(`🎉 레벨 업! 레벨 ${newLevel}에 도달했습니다! 새로운 장비와 보스에 도전해보세요!`);
    }

    return { level: newLevel, xp: newXp };
  };

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      alert(err.message || "구글 로그인 실패");
    }
  };

  // Anonymous Login
  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      alert(err.message || "익명 로그인 실패");
    }
  };

  // Start Mini Monster Battle
  const startHuntBattle = (monster) => {
    setBattle({
      target: monster,
      isBoss: false,
      enemyHp: monster.hp,
      maxEnemyHp: monster.hp,
      playerHp: stats.maxHp,
      logs: [`⚔️ ${monster.name}(이)가 나타났습니다! 턴제 전투가 시작됩니다.`],
      isOver: false,
      isWin: false,
      turn: 1,
    });
  };

  // Start Boss Raid Battle
  const startBossBattle = (boss) => {
    if (player.level < boss.reqLevel) {
      alert(`🔒 ${boss.name} 보스는 레벨 ${boss.reqLevel} 이상부터 도전 가능합니다!`);
      return;
    }
    setBattle({
      target: boss,
      isBoss: true,
      enemyHp: boss.hp,
      maxEnemyHp: boss.maxHp,
      playerHp: stats.maxHp,
      logs: [`🔥 [보스 레이드] ${boss.name}(이)가 등판했습니다! 턴제 사투를 시작합니다.`],
      isOver: false,
      isWin: false,
      turn: 1,
    });
  };

  // Execute Turn Action (Attack)
  const handleBattleAttack = (isSkill = false) => {
    if (!battle || battle.isOver) return;

    const currentTurn = battle.turn;
    let newLogs = [...battle.logs];

    // 1. Player Attacks Enemy
    const skillMultiplier = isSkill ? 1.4 : 1.0;
    const playerDamage = Math.round(calculateDamage(stats.totalAtk, battle.target.def) * skillMultiplier);
    const nextEnemyHp = Math.max(0, battle.enemyHp - playerDamage);

    newLogs.unshift(
      `[Turn ${currentTurn}] 🗡️ 플레이어의 ${isSkill ? "강력한 필살기" : "공격"}! ${battle.target.name}에게 ${playerDamage} 데미지!`
    );

    // Enemy Defeated?
    if (nextEnemyHp <= 0) {
      newLogs.unshift(`🏆 ${battle.target.name}(을)를 처치했습니다! 승리!`);
      
      const earnedGold = battle.isBoss ? battle.target.rewardGold : battle.target.goldReward;
      const earnedXp = battle.isBoss ? battle.target.rewardXp : battle.target.xpReward;

      newLogs.unshift(`💰 +${earnedGold} Gold, 🌟 +${earnedXp} XP 획득!`);

      // Update Player Data
      const { level: newLevel, xp: newXp } = checkLevelUp(player.xp + earnedXp, player.level, player);
      
      const newDefeatedBosses = battle.isBoss && !player.defeatedBossIds.includes(battle.target.id)
        ? [...player.defeatedBossIds, battle.target.id]
        : player.defeatedBossIds;

      const nextPlayerState = {
        ...player,
        gold: player.gold + earnedGold,
        xp: newXp,
        level: newLevel,
        defeatedBossIds: newDefeatedBosses,
      };

      setPlayer(nextPlayerState);
      handleSave(nextPlayerState);

      setBattle({
        ...battle,
        enemyHp: 0,
        logs: newLogs,
        isOver: true,
        isWin: true,
      });
      return;
    }

    // 2. Enemy Attacks Player
    const enemyDamage = calculateDamage(battle.target.atk, stats.totalDef);
    const nextPlayerHp = Math.max(0, battle.playerHp - enemyDamage);

    newLogs.unshift(
      `[Turn ${currentTurn}] 💥 ${battle.target.name}의 공격! ${enemyDamage} 데미지를 입었습니다.`
    );

    // Player Defeated?
    if (nextPlayerHp <= 0) {
      newLogs.unshift(`💀 체력이 모두 소진되어 패배했습니다...`);
      setBattle({
        ...battle,
        enemyHp: nextEnemyHp,
        playerHp: 0,
        logs: newLogs,
        isOver: true,
        isWin: false,
      });
      return;
    }

    // Next Turn
    setBattle({
      ...battle,
      enemyHp: nextEnemyHp,
      playerHp: nextPlayerHp,
      logs: newLogs,
      turn: currentTurn + 1,
    });
  };

  // Battle Potion Heal
  const handleUsePotion = () => {
    if (!battle || battle.isOver) return;
    if (player.potions <= 0) {
      alert("포션이 부족합니다! 상점에서 구매하세요.");
      return;
    }

    const healAmount = 100;
    const nextHp = Math.min(stats.maxHp, battle.playerHp + healAmount);
    const nextPotions = player.potions - 1;

    let newLogs = [...battle.logs];
    newLogs.unshift(`🧪 포션을 사용하여 체력을 +${healAmount} 회복했습니다. (남은 포션: ${nextPotions}개)`);

    // Enemy still attacks after using potion
    const enemyDamage = calculateDamage(battle.target.atk, stats.totalDef);
    const finalPlayerHp = Math.max(0, nextHp - enemyDamage);

    newLogs.unshift(
      `[Turn ${battle.turn}] 💥 ${battle.target.name}의 공격! ${enemyDamage} 데미지를 입었습니다.`
    );

    const nextPlayerState = { ...player, potions: nextPotions };
    setPlayer(nextPlayerState);

    setBattle({
      ...battle,
      playerHp: finalPlayerHp,
      logs: newLogs,
      turn: battle.turn + 1,
      isOver: finalPlayerHp <= 0,
      isWin: false,
    });
  };

  // Buy Weapon
  const handleBuyWeapon = (item) => {
    if (player.gold < item.price) {
      alert("골드가 부족합니다!");
      return;
    }
    if (player.ownedWeaponIds.includes(item.id)) {
      alert("이미 소유한 무기입니다.");
      return;
    }

    const nextPlayer = {
      ...player,
      gold: player.gold - item.price,
      ownedWeaponIds: [...player.ownedWeaponIds, item.id],
      equippedWeaponId: item.id, // Auto equip
    };
    setPlayer(nextPlayer);
    handleSave(nextPlayer);
    alert(`🎉 ${item.name}(을)를 구매하여 장착했습니다!`);
  };

  // Buy Armor
  const handleBuyArmor = (item) => {
    if (player.gold < item.price) {
      alert("골드가 부족합니다!");
      return;
    }
    if (player.ownedArmorIds.includes(item.id)) {
      alert("이미 소유한 갑옷입니다.");
      return;
    }

    const nextPlayer = {
      ...player,
      gold: player.gold - item.price,
      ownedArmorIds: [...player.ownedArmorIds, item.id],
      equippedArmorId: item.id, // Auto equip
    };
    setPlayer(nextPlayer);
    handleSave(nextPlayer);
    alert(`🎉 ${item.name}(을)를 구매하여 장착했습니다!`);
  };

  // Buy Potion
  const handleBuyPotion = () => {
    const price = 50;
    if (player.gold < price) {
      alert("골드가 부족합니다!");
      return;
    }
    const nextPlayer = {
      ...player,
      gold: player.gold - price,
      potions: (player.potions || 0) + 1,
    };
    setPlayer(nextPlayer);
    handleSave(nextPlayer);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation / Auth Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              ainew - 보스 레이드 RPG
            </h1>
            <p className="text-xs text-slate-400">턴제 사냥 & 보스 공략 시스템</p>
          </div>
        </div>

        {/* User Auth Status */}
        <div className="flex items-center gap-3">
          {authLoading ? (
            <span className="text-xs text-slate-400">인증 확인 중...</span>
          ) : user ? (
            <div className="flex items-center gap-3 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700">
              <span className="text-xs font-medium text-slate-300">
                {user.isAnonymous ? "👤 익명" : `🌐 ${user.displayName || user.email}`}
              </span>
              <button
                onClick={() => signOut(auth)}
                className="text-xs text-slate-400 hover:text-white underline ml-1"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoogleLogin}
                className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition shadow"
              >
                Google 로그인
              </button>
              <button
                onClick={handleAnonymousLogin}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 border border-slate-700 transition"
              >
                익명 로그인
              </button>
            </div>
          )}

          {/* Manual Save Button */}
          <button
            onClick={() => handleSave()}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1"
          >
            💾 저장하기
          </button>
        </div>
      </header>

      {/* Save Notification Banner */}
      {saveNotification && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 text-xs text-center py-2 font-medium">
          {saveNotification}
        </div>
      )}

      {/* Main Content Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Player Stats HUD */}
        <section className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            
            {/* Header: Level & Gold */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">CHARACTER</span>
                <h2 className="text-2xl font-black text-white">Lv. {stats.level} 모험가</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">보유 골드</span>
                <p className="text-lg font-extrabold text-amber-400">💰 {player.gold.toLocaleString()} G</p>
              </div>
            </div>

            {/* XP Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">경험치 (XP)</span>
                <span className="text-amber-400">{player.xp} / {stats.maxXp} ({Math.floor((player.xp / stats.maxXp) * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (player.xp / stats.maxXp) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Battle Stats: HP, ATK, DEF */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                <span className="text-xs text-slate-400 block">최대 HP</span>
                <span className="text-base font-bold text-emerald-400">❤️ {stats.maxHp}</span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                <span className="text-xs text-slate-400 block">공격력 (ATK)</span>
                <span className="text-base font-bold text-rose-400">⚔️ {stats.totalAtk}</span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                <span className="text-xs text-slate-400 block">방어력 (DEF)</span>
                <span className="text-base font-bold text-blue-400">🛡️ {stats.totalDef}</span>
              </div>
            </div>

            {/* Currently Equipped Equipment */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">장착 중인 장비</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{stats.weapon.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{stats.weapon.name}</p>
                      <p className="text-[11px] text-slate-400">공격력 +{stats.weapon.atk}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">무기</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{stats.armor.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{stats.armor.name}</p>
                      <p className="text-[11px] text-slate-400">방어력 +{stats.armor.def} / HP +{stats.armor.hpBonus}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">갑옷</span>
                </div>
              </div>
            </div>

            {/* Consumables Inventory */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧪</span>
                <span className="font-medium text-amber-300">체력 포션 (HP +100)</span>
              </div>
              <span className="font-bold text-amber-400 text-sm">{player.potions || 0} 개</span>
            </div>

          </div>
        </section>

        {/* Right Column: Game Action Tabs & Battle Arena */}
        <section className="lg:col-span-2 space-y-4">
          
          {/* Action Tabs Header */}
          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab("hunt")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === "hunt"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>⚔️</span> 사냥터 (파밍)
            </button>
            <button
              onClick={() => setActiveTab("shop")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === "shop"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>🛒</span> 상점 & 장비
            </button>
            <button
              onClick={() => setActiveTab("boss")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === "boss"
                  ? "bg-rose-600 text-white shadow-md animate-pulse"
                  : "text-rose-400 hover:text-rose-300 hover:bg-slate-800/50"
              }`}
            >
              <span>👑</span> 보스 레이드
            </button>
          </div>

          {/* TAB 1: HUNTING GROUNDS */}
          {activeTab === "hunt" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="font-bold text-lg text-white mb-1">🌲 사냥터 선택</h3>
                <p className="text-xs text-slate-400 mb-4">미니 몬스터를 처치하여 골드와 경험치를 수급하세요.</p>

                <div className="space-y-4">
                  {HUNTING_GROUNDS.map((zone) => {
                    const isLocked = player.level < zone.reqLevel;
                    return (
                      <div
                        key={zone.id}
                        className={`p-4 rounded-xl border transition ${
                          isLocked
                            ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                            : "bg-slate-800/40 border-slate-700/60 hover:border-amber-500/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                            {zone.name}
                            {isLocked && <span className="text-xs text-amber-500 font-semibold">[🔒 Lv.{zone.reqLevel} 필요]</span>}
                          </h4>
                        </div>

                        {/* Zone Monsters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {zone.monsters.map((monster) => (
                            <div
                              key={monster.id}
                              className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-xl">{monster.icon}</span>
                                <div>
                                  <p className="font-semibold text-slate-200">{monster.name}</p>
                                  <p className="text-[10px] text-slate-400">💰 {monster.goldReward}G / 🌟 {monster.xpReward}XP</p>
                                </div>
                              </div>
                              <button
                                disabled={isLocked}
                                onClick={() => startHuntBattle(monster)}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-extrabold text-xs transition"
                              >
                                사냥하기
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHOP & EQUIPMENT */}
          {activeTab === "shop" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">🛒 마을 상점</h3>
                  <p className="text-xs text-slate-400">레벨에 맞는 강력한 무기와 갑옷을 구매하세요.</p>
                </div>
                <div className="flex gap-1.5 bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setShopCategory("weapons")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      shopCategory === "weapons" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    무기
                  </button>
                  <button
                    onClick={() => setShopCategory("armors")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      shopCategory === "armors" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    갑옷
                  </button>
                  <button
                    onClick={() => setShopCategory("items")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      shopCategory === "items" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    소모품
                  </button>
                </div>
              </div>

              {/* Weapons Shop List */}
              {shopCategory === "weapons" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WEAPONS.map((item) => {
                    const isEquipped = player.equippedWeaponId === item.id;
                    const isOwned = player.ownedWeaponIds.includes(item.id);
                    const isLevelLocked = player.level < item.reqLevel;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                          isEquipped
                            ? "bg-amber-500/10 border-amber-500/50"
                            : "bg-slate-800/40 border-slate-700/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{item.icon}</span>
                            <div>
                              <p className="font-bold text-sm text-white">{item.name}</p>
                              <p className="text-xs text-rose-400 font-semibold">공격력 +{item.atk}</p>
                              <p className="text-[11px] text-slate-400">착용 레벨: Lv.{item.reqLevel}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-700/40 pt-3">
                          <span className="text-xs font-bold text-amber-400">
                            {item.price === 0 ? "기본 제공" : `${item.price.toLocaleString()} G`}
                          </span>
                          {isEquipped ? (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/40">
                              장착 중
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={() => setPlayer({ ...player, equippedWeaponId: item.id })}
                              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
                            >
                              장착하기
                            </button>
                          ) : (
                            <button
                              disabled={isLevelLocked || player.gold < item.price}
                              onClick={() => handleBuyWeapon(item)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-lg text-xs font-extrabold transition"
                            >
                              {isLevelLocked ? `Lv.${item.reqLevel} 필요` : "구매하기"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Armors Shop List */}
              {shopCategory === "armors" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ARMORS.map((item) => {
                    const isEquipped = player.equippedArmorId === item.id;
                    const isOwned = player.ownedArmorIds.includes(item.id);
                    const isLevelLocked = player.level < item.reqLevel;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                          isEquipped
                            ? "bg-amber-500/10 border-amber-500/50"
                            : "bg-slate-800/40 border-slate-700/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{item.icon}</span>
                            <div>
                              <p className="font-bold text-sm text-white">{item.name}</p>
                              <p className="text-xs text-blue-400 font-semibold">방어력 +{item.def} / HP +{item.hpBonus}</p>
                              <p className="text-[11px] text-slate-400">착용 레벨: Lv.{item.reqLevel}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-700/40 pt-3">
                          <span className="text-xs font-bold text-amber-400">
                            {item.price === 0 ? "기본 제공" : `${item.price.toLocaleString()} G`}
                          </span>
                          {isEquipped ? (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/40">
                              장착 중
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={() => setPlayer({ ...player, equippedArmorId: item.id })}
                              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
                            >
                              장착하기
                            </button>
                          ) : (
                            <button
                              disabled={isLevelLocked || player.gold < item.price}
                              onClick={() => handleBuyArmor(item)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-lg text-xs font-extrabold transition"
                            >
                              {isLevelLocked ? `Lv.${item.reqLevel} 필요` : "구매하기"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Items / Consumables Shop */}
              {shopCategory === "items" && (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🧪</span>
                    <div>
                      <p className="font-bold text-sm text-white">체력 포션 (HP +100)</p>
                      <p className="text-xs text-slate-400">전투 중 즉시 체력 100을 회복합니다.</p>
                      <p className="text-xs text-amber-400 font-bold mt-1">가격: 50 G</p>
                    </div>
                  </div>
                  <button
                    disabled={player.gold < 50}
                    onClick={handleBuyPotion}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-extrabold text-xs rounded-xl transition"
                  >
                    구매하기 (+1)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BOSS RAID */}
          {activeTab === "boss" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="mb-4">
                  <h3 className="font-extrabold text-xl text-rose-400 flex items-center gap-2">
                    👑 보스 레이드 토벌전
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    레벨 10, 15, 20에 도달하여 장비를 갖추고 전설의 보스에 도전하세요! (공격 7회+ / 4회 피격 버티기 밸런스 설계)
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {BOSSES.map((boss) => {
                    const isLocked = player.level < boss.reqLevel;
                    const isDefeated = player.defeatedBossIds.includes(boss.id);

                    return (
                      <div
                        key={boss.id}
                        className={`p-5 rounded-2xl border transition relative overflow-hidden ${
                          isDefeated
                            ? "bg-emerald-950/20 border-emerald-500/40"
                            : isLocked
                            ? "bg-slate-900/40 border-slate-800/80 opacity-60"
                            : "bg-gradient-to-r from-rose-950/40 to-slate-900 border-rose-500/40 hover:border-rose-500"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span className="text-4xl">{boss.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-lg text-white">{boss.name}</h4>
                                <span className="text-xs px-2.5 py-0.5 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30 font-bold">
                                  권장 레벨: Lv.{boss.reqLevel}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1">{boss.desc}</p>
                              <div className="flex gap-4 mt-2 text-xs font-semibold text-slate-400">
                                <span>❤️ HP: {boss.hp}</span>
                                <span>⚔️ ATK: {boss.atk}</span>
                                <span>🛡️ DEF: {boss.def}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isDefeated && (
                              <span className="text-xs font-bold text-emerald-400 px-3 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                                🏆 토벌 성공
                              </span>
                            )}
                            <button
                              disabled={isLocked}
                              onClick={() => startBossBattle(boss)}
                              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition active:scale-95"
                            >
                              {isLocked ? `🔒 Lv.${boss.reqLevel} 해금` : "레이드 입장!"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TURN-BASED BATTLE MODAL ARENA */}
          {battle && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-6 flex flex-col max-h-[90vh]">
                
                {/* Battle Arena Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                    {battle.isBoss ? "🔥 BOSS RAID ARENA" : "⚔️ HUNTING ARENA"}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Turn {battle.turn}</span>
                </div>

                {/* HP Bars Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Player HP */}
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-200">🗡️ 플레이어</span>
                      <span className="text-emerald-400">{battle.playerHp} / {stats.maxHp}</span>
                    </div>
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${Math.max(0, (battle.playerHp / stats.maxHp) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Enemy HP */}
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-rose-300">{battle.target.icon} {battle.target.name}</span>
                      <span className="text-rose-400">{battle.enemyHp} / {battle.maxEnemyHp}</span>
                    </div>
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="bg-rose-500 h-full transition-all duration-300"
                        style={{ width: `${Math.max(0, (battle.enemyHp / battle.maxEnemyHp) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Turn Action Buttons */}
                {!battle.isOver ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleBattleAttack(false)}
                      className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm transition shadow active:scale-95"
                    >
                      ⚔️ 일반 공격
                    </button>
                    <button
                      onClick={() => handleBattleAttack(true)}
                      className="py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm transition shadow active:scale-95"
                    >
                      💥 필살기 (+40%)
                    </button>
                    <button
                      onClick={handleUsePotion}
                      className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm transition shadow active:scale-95"
                    >
                      🧪 포션 ({player.potions})
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setBattle(null)}
                    className="w-full py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-extrabold text-sm transition shadow"
                  >
                    전투 종료 (돌아가기)
                  </button>
                )}

                {/* Turn Log Viewer */}
                <div className="flex-1 overflow-y-auto bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs space-y-2 text-slate-300 min-h-[140px]">
                  {battle.logs.map((log, idx) => (
                    <p key={idx} className={idx === 0 ? "text-amber-400 font-bold" : "opacity-80"}>
                      {log}
                    </p>
                  ))}
                </div>

              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
