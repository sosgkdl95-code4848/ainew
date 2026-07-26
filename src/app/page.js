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
  const [activeTab, setActiveTab] = useState("hunt");
  const [shopCategory, setShopCategory] = useState("weapons");

  // Battle state
  // { target, isBoss, enemyHp, maxEnemyHp, playerHp, logs: [], isOver: false, isWin: false, turn: 1, skillCooldown: 0, specialDefCooldown: 0, lastBossSpecialTurn: false }
  const [battle, setBattle] = useState(null);
  const [battleText, setBattleText] = useState("");
  const [saveNotification, setSaveNotification] = useState("");
  const [hitEffect, setHitEffect] = useState(null);

  // Math Quiz Modal State
  const [quizModal, setQuizModal] = useState(null);

  // Inn Rest Challenge State
  const [innChallenge, setInnChallenge] = useState(null);

  // Stats
  const stats = calculatePlayerStats(player);
  const playerCurrentHp = player.currentHp !== undefined ? player.currentHp : stats.maxHp;

  // Auth Listener
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

  // Save game
  const handleSave = async (updatedPlayer = player) => {
    if (user) {
      await saveGameData(user.uid, updatedPlayer);
      setSaveNotification("✅ 게임 데이터가 Firestore에 안전하게 저장되었습니다!");
    } else {
      setSaveNotification("⚠️ 로그인 상태가 아닙니다.");
    }
    setTimeout(() => setSaveNotification(""), 3000);
  };

  // Level Up Check
  const checkLevelUp = (currentXp, currentLevel) => {
    let newXp = currentXp;
    let newLevel = currentLevel;
    let leveledUp = false;

    while (newXp >= newLevel * 60 && newLevel < 20) {
      newXp -= newLevel * 60;
      newLevel += 1;
      leveledUp = true;
    }

    if (leveledUp) {
      alert(`🎉 레벨 업! Lv.${newLevel} 달성! 스탯이 상승하고 새로운 장비/보스가 해금되었습니다!`);
    }

    return { level: newLevel, xp: newXp };
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      alert(err.message || "구글 로그인 실패");
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      alert(err.message || "익명 로그인 실패");
    }
  };

  // Start Battle
  const startBattle = (target, isBoss) => {
    if (isBoss && player.level < target.reqLevel) {
      alert(`🔒 ${target.name} 보스는 레벨 ${target.reqLevel} 이상부터 도전 가능합니다!`);
      return;
    }

    let startingHp = playerCurrentHp;
    if (startingHp <= 0) {
      startingHp = Math.round(stats.maxHp * 0.5);
      alert("🩹 체력이 0이었던 모험가가 50% 체력을 회복하고 전투에 진입합니다!");
      setPlayer({ ...player, currentHp: startingHp });
    }

    const initialText = `${target.name}(이)가 무대에 등장했다! (현재 HP: ${startingHp} / ${stats.maxHp})`;
    setBattleText(initialText);

    setBattle({
      target,
      isBoss,
      enemyHp: target.hp || target.maxHp,
      maxEnemyHp: target.hp || target.maxHp,
      playerHp: startingHp,
      logs: [initialText],
      isOver: false,
      isWin: false,
      turn: 1,
      skillCooldown: 0,
      specialDefCooldown: 0,
      lastBossSpecialTurn: false, // Tracks if previous boss attack was special
    });
  };

  // Generate Math Problem
  const generateBattleMathProblem = (isBoss, reqLevel = 10) => {
    if (!isBoss) {
      const n1 = Math.floor(Math.random() * 8) + 2;
      const n2 = Math.floor(Math.random() * 8) + 2;
      return { questionText: `${n1} × ${n2}`, answer: n1 * n2 };
    } else {
      const isDivision = Math.random() < 0.5;

      if (reqLevel <= 10) {
        if (isDivision) {
          const ans = Math.round((Math.floor(Math.random() * 20 + 2) * 0.4) * 10) / 10;
          const divisor = Math.floor(Math.random() * 4) + 2;
          const dividend = Math.round(ans * divisor * 10) / 10;
          return { questionText: `${dividend} ÷ ${divisor}`, answer: ans };
        } else {
          const factor1 = Math.round((Math.floor(Math.random() * 45 + 5) * 0.2) * 10) / 10;
          const factor2 = Math.floor(Math.random() * 8) + 2;
          const ans = Math.round(factor1 * factor2 * 100) / 100;
          return { questionText: `${factor1} × ${factor2}`, answer: ans };
        }
      } else if (reqLevel <= 15) {
        if (isDivision) {
          const ans = Math.round((Math.floor(Math.random() * 20 + 2) * 0.25) * 100) / 100;
          const divisor = [2, 4, 5][Math.floor(Math.random() * 3)];
          const dividend = Math.round(ans * divisor * 100) / 100;
          return { questionText: `${dividend} ÷ ${divisor}`, answer: ans };
        } else {
          const factor1 = Math.round((Math.floor(Math.random() * 20 + 1) * 0.25) * 100) / 100;
          const factor2 = [2, 4, 8][Math.floor(Math.random() * 3)];
          const ans = Math.round(factor1 * factor2 * 100) / 100;
          return { questionText: `${factor1} × ${factor2}`, answer: ans };
        }
      } else {
        if (isDivision) {
          const divisor = [0.5, 0.25, 2, 4][Math.floor(Math.random() * 4)];
          const ans = Math.round((Math.floor(Math.random() * 30 + 5) * 0.5) * 10) / 10;
          const dividend = Math.round(ans * divisor * 1000) / 1000;
          return { questionText: `${dividend} ÷ ${divisor}`, answer: ans };
        } else {
          const factor1 = Math.round((Math.floor(Math.random() * 15 + 1) * 0.125) * 1000) / 1000;
          const factor2 = [4, 8, 16][Math.floor(Math.random() * 3)];
          const ans = Math.round(factor1 * factor2 * 1000) / 1000;
          return { questionText: `${factor1} × ${factor2}`, answer: ans };
        }
      }
    }
  };

  // Open Skill Quiz Modal
  const handleOpenSkillQuiz = () => {
    if (!battle || battle.isOver) return;
    if (battle.skillCooldown > 0) {
      alert(`⏳ 스킬 쿨타임 중입니다! (${battle.skillCooldown}턴 남음)`);
      return;
    }

    const problem = generateBattleMathProblem(battle.isBoss, battle.target.reqLevel);
    setQuizModal({
      actionType: "skill",
      questionText: problem.questionText,
      answer: problem.answer,
      userAnswer: "",
      isBoss: battle.isBoss,
    });
  };

  // Open Special Defense Quiz Modal
  const handleOpenSpecialDefendQuiz = () => {
    if (!battle || battle.isOver) return;
    if (battle.specialDefCooldown > 0) {
      alert(`⏳ 특수 방어 쿨타임 중입니다! (${battle.specialDefCooldown}턴 남음)`);
      return;
    }

    const problem = generateBattleMathProblem(battle.isBoss, battle.target.reqLevel);
    setQuizModal({
      actionType: "specialDefend",
      questionText: problem.questionText,
      answer: problem.answer,
      userAnswer: "",
      isBoss: battle.isBoss,
    });
  };

  // Submit Battle Math Quiz
  const handleQuizSubmit = (e) => {
    e.preventDefault();
    if (!quizModal) return;

    const userVal = parseFloat(quizModal.userAnswer);
    const isCorrect = Math.abs(userVal - quizModal.answer) < 0.001;
    const currentQuiz = quizModal;
    setQuizModal(null);

    executeTurn(currentQuiz.actionType, isCorrect, currentQuiz);
  };

  // Open Inn Rest Challenge
  const handleStartInnChallenge = () => {
    if (playerCurrentHp >= stats.maxHp) {
      alert("이미 체력이 가득 차있습니다!");
      return;
    }

    const generatedQuestions = Array.from({ length: 10 }, () => {
      const n1 = Math.floor(Math.random() * 8) + 2;
      const n2 = Math.floor(Math.random() * 8) + 2;
      return { num1: n1, num2: n2, answer: n1 * n2 };
    });

    setInnChallenge({
      questions: generatedQuestions,
      currentIndex: 0,
      correctCount: 0,
      userAnswer: "",
      isComplete: false,
      isSuccess: false,
    });
  };

  // Submit Single Question in Inn Challenge
  const handleInnQuestionSubmit = (e) => {
    e.preventDefault();
    if (!innChallenge || innChallenge.isComplete) return;

    const currentQ = innChallenge.questions[innChallenge.currentIndex];
    const isCorrect = parseInt(innChallenge.userAnswer, 10) === currentQ.answer;
    const nextCorrect = isCorrect ? innChallenge.correctCount + 1 : innChallenge.correctCount;
    const nextIndex = innChallenge.currentIndex + 1;

    if (nextIndex >= 10) {
      const passed = nextCorrect >= 6;
      setInnChallenge({
        ...innChallenge,
        currentIndex: 10,
        correctCount: nextCorrect,
        userAnswer: "",
        isComplete: true,
        isSuccess: passed,
      });

      if (passed) {
        const nextPlayer = { ...player, currentHp: stats.maxHp };
        setPlayer(nextPlayer);
        handleSave(nextPlayer);
      }
    } else {
      setInnChallenge({
        ...innChallenge,
        currentIndex: nextIndex,
        correctCount: nextCorrect,
        userAnswer: "",
      });
    }
  };

  // Turn Action Logic
  const executeTurn = (actionType, quizSuccess = true, quizData = null) => {
    if (!battle || battle.isOver) return;

    let newLogs = [...battle.logs];
    let defenseMultiplier = 1.0;
    let playerDamage = 0;
    let currentEnemyHp = battle.enemyHp;
    let currentPlayerHp = battle.playerHp;
    let nextSkillCooldown = Math.max(0, battle.skillCooldown - 1);
    let nextSpecialDefCooldown = Math.max(0, battle.specialDefCooldown - 1);

    // 1. PLAYER ACTION
    if (actionType === "attack") {
      setHitEffect("enemy");
      setTimeout(() => setHitEffect(null), 500);

      playerDamage = calculateDamage(stats.totalAtk, battle.target.def);
      currentEnemyHp = Math.max(0, battle.enemyHp - playerDamage);
      const text = `🗡️ 모험가의 일반 공격! ${battle.target.name}에게 ${playerDamage} 데미지!`;
      setBattleText(text);
      newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
    } else if (actionType === "skill") {
      if (quizSuccess) {
        setHitEffect("enemy");
        setTimeout(() => setHitEffect(null), 500);

        playerDamage = Math.round(calculateDamage(stats.totalAtk, battle.target.def) * 1.5);
        currentEnemyHp = Math.max(0, battle.enemyHp - playerDamage);
        nextSkillCooldown = 2;

        const text = `🎉 [정답! ${quizData.questionText} = ${quizData.answer}] ✨ 1.5배 강력한 필살 스킬 발동! ${battle.target.name}에게 ${playerDamage} 데미지!`;
        setBattleText(text);
        newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
      } else {
        const text = `❌ [오답! 문제: ${quizData.questionText} (정답: ${quizData.answer})] 스킬 실패! 턴을 허비하고 몬스터에게 턴이 넘어갑니다.`;
        setBattleText(text);
        newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
      }
    } else if (actionType === "defend") {
      defenseMultiplier = 0.5;
      const text = `🛡️ 일반 방어 자세! 이번 턴 피격 데미지 50% 감소 (0.5배)`;
      setBattleText(text);
      newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
    } else if (actionType === "specialDefend") {
      nextSpecialDefCooldown = 3;

      if (quizSuccess) {
        defenseMultiplier = 0.1;
        const text = `🎉 [정답! ${quizData.questionText} = ${quizData.answer}] 🛡️✨ 특수 방어 성공! 이번 턴 피격 데미지 90% 차단! (0.1배)`;
        setBattleText(text);
        newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
      } else {
        defenseMultiplier = 1.0;
        const text = `❌ [오답! 문제: ${quizData.questionText} (정답: ${quizData.answer})] 특수 방어 실패! 90% 차단에 실패하여 일반 피해를 입습니다.`;
        setBattleText(text);
        newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
      }
    } else if (actionType === "potion") {
      if (player.potions <= 0) {
        alert("포션이 부족합니다!");
        return;
      }
      const heal = 100;
      currentPlayerHp = Math.min(stats.maxHp, battle.playerHp + heal);
      const text = `🧪 포션을 사용하여 체력을 +${heal} 회복했다!`;
      setBattleText(text);
      newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
      setPlayer({ ...player, potions: player.potions - 1, currentHp: currentPlayerHp });
    }

    // Check Enemy Defeat
    if (currentEnemyHp <= 0) {
      const winText = `🏆 ${battle.target.name}(을)를 물리쳤다! 승리!`;
      setBattleText(winText);
      newLogs.unshift(winText);

      const earnedGold = battle.isBoss ? battle.target.rewardGold : battle.target.goldReward;
      const earnedXp = battle.isBoss ? battle.target.rewardXp : battle.target.xpReward;

      const { level: newLevel, xp: newXp } = checkLevelUp(player.xp + earnedXp, player.level);
      const newDefeatedBosses = battle.isBoss && !player.defeatedBossIds.includes(battle.target.id)
        ? [...player.defeatedBossIds, battle.target.id]
        : player.defeatedBossIds;

      const nextPlayerState = {
        ...player,
        gold: player.gold + earnedGold,
        xp: newXp,
        level: newLevel,
        currentHp: currentPlayerHp,
        defeatedBossIds: newDefeatedBosses,
      };

      setPlayer(nextPlayerState);
      handleSave(nextPlayerState);

      setBattle({
        ...battle,
        enemyHp: 0,
        playerHp: currentPlayerHp,
        logs: newLogs,
        isOver: true,
        isWin: true,
      });
      return;
    }

    // 2. ENEMY COUNTER ATTACK (With Boss Special Attack Rules)
    setTimeout(() => {
      setHitEffect("player");
      setTimeout(() => setHitEffect(null), 500);

      // Boss Attack Type Decision:
      // - Special Attack allowed ONLY on Turn 3 or later (battle.turn >= 3)
      // - Cannot happen consecutively (!battle.lastBossSpecialTurn)
      // - Random 50% chance when conditions are met!
      let isBossSpecialAttack = false;
      if (battle.isBoss && battle.turn >= 3 && !battle.lastBossSpecialTurn) {
        isBossSpecialAttack = Math.random() < 0.5;
      }

      let bossAttackMultiplier = isBossSpecialAttack ? 1.5 : 1.0;
      let rawEnemyDamage = calculateDamage(battle.target.atk * bossAttackMultiplier, stats.totalDef);
      let finalEnemyDamage = Math.max(1, Math.round(rawEnemyDamage * defenseMultiplier));

      const nextPlayerHp = Math.max(0, currentPlayerHp - finalEnemyDamage);
      
      let enemyText = "";
      if (isBossSpecialAttack) {
        enemyText = `🔥 [보스 특수 스킬 공격!] ${battle.target.name}의 분노한 필살 공격! 모험가에게 ${finalEnemyDamage} 데미지! ${
          defenseMultiplier === 0.1 ? "(특수 방어 성공: 데미지 90% 차단!)" : defenseMultiplier === 0.5 ? "(일반 방어: 데미지 50% 감쇄)" : ""
        }`;
      } else {
        enemyText = `💥 ${battle.target.name}의 기본 공격! 모험가에게 ${finalEnemyDamage} 데미지! ${
          defenseMultiplier === 0.1 ? "(특수 방어 성공: 데미지 90% 차단!)" : defenseMultiplier === 0.5 ? "(일반 방어: 데미지 50% 감쇄)" : ""
        }`;
      }

      setBattleText(enemyText);
      newLogs.unshift(`[Turn ${battle.turn}] ${enemyText}`);

      const nextPlayerState = { ...player, currentHp: nextPlayerHp };
      setPlayer(nextPlayerState);

      if (nextPlayerHp <= 0) {
        const loseText = `💀 모험가가 쓰러졌습니다... (마을에서 50% 체력으로 복구됩니다)`;
        setBattleText(loseText);
        newLogs.unshift(loseText);

        const respawnState = { ...player, currentHp: Math.round(stats.maxHp * 0.5) };
        setPlayer(respawnState);
        handleSave(respawnState);

        setBattle({
          ...battle,
          enemyHp: currentEnemyHp,
          playerHp: 0,
          logs: newLogs,
          isOver: true,
          isWin: false,
        });
      } else {
        setBattle({
          ...battle,
          enemyHp: currentEnemyHp,
          playerHp: nextPlayerHp,
          logs: newLogs,
          turn: battle.turn + 1,
          skillCooldown: nextSkillCooldown,
          specialDefCooldown: nextSpecialDefCooldown,
          lastBossSpecialTurn: isBossSpecialAttack, // Record if this attack was special
        });
      }
    }, 600);
  };

  // Buy Helpers
  const handleBuyWeapon = (item) => {
    if (player.gold < item.price) return alert("골드가 부족합니다!");
    if (player.ownedWeaponIds.includes(item.id)) return;
    const next = { ...player, gold: player.gold - item.price, ownedWeaponIds: [...player.ownedWeaponIds, item.id], equippedWeaponId: item.id };
    setPlayer(next);
    handleSave(next);
  };

  const handleBuyArmor = (item) => {
    if (player.gold < item.price) return alert("골드가 부족합니다!");
    if (player.ownedArmorIds.includes(item.id)) return;
    const next = { ...player, gold: player.gold - item.price, ownedArmorIds: [...player.ownedArmorIds, item.id], equippedArmorId: item.id };
    setPlayer(next);
    handleSave(next);
  };

  const handleBuyPotion = () => {
    if (player.gold < 50) return alert("골드가 부족합니다!");
    const next = { ...player, gold: player.gold - 50, potions: (player.potions || 0) + 1 };
    setPlayer(next);
    handleSave(next);
  };

  const getHpBarColor = (current, max) => {
    const pct = (current / max) * 100;
    if (pct > 50) return "bg-emerald-500";
    if (pct > 20) return "bg-amber-400";
    return "bg-rose-600 animate-pulse";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              ainew - 포켓몬 스타일 RPG
            </h1>
            <p className="text-xs text-slate-400">보스 3턴 이후 특수 공격 & 랜덤 패턴 시스템</p>
          </div>
        </div>

        {/* Auth & Save */}
        <div className="flex items-center gap-3">
          {authLoading ? (
            <span className="text-xs text-slate-400">인증 확인 중...</span>
          ) : user ? (
            <div className="flex items-center gap-3 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700">
              <span className="text-xs font-medium text-slate-300">
                {user.isAnonymous ? "👤 익명" : `🌐 ${user.displayName || user.email}`}
              </span>
              <button onClick={() => signOut(auth)} className="text-xs text-slate-400 hover:text-white underline">
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleGoogleLogin} className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold shadow">
                Google 로그인
              </button>
              <button onClick={handleAnonymousLogin} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
                익명 로그인
              </button>
            </div>
          )}

          <button
            onClick={() => handleSave()}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition active:scale-95 flex items-center gap-1"
          >
            💾 저장하기
          </button>
        </div>
      </header>

      {/* Save Notification */}
      {saveNotification && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 text-xs text-center py-2 font-medium">
          {saveNotification}
        </div>
      )}

      {/* Main Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left HUD */}
        <section className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            
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
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (player.xp / stats.maxXp) * 100)}%` }}></div>
              </div>
            </div>

            {/* Persistent HP Bar & Inn Rest Button */}
            <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">현재 체력 (연속 유지)</span>
                <span className="text-emerald-400">{playerCurrentHp} / {stats.maxHp} HP</span>
              </div>
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-700">
                <div className={`h-full transition-all duration-300 ${getHpBarColor(playerCurrentHp, stats.maxHp)}`} style={{ width: `${Math.max(0, (playerCurrentHp / stats.maxHp) * 100)}%` }}></div>
              </div>
              <button
                onClick={handleStartInnChallenge}
                className="w-full mt-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40 text-white text-xs font-extrabold transition shadow flex items-center justify-center gap-1.5 active:scale-95"
              >
                🍺 마을 여관 휴식 (구구단 10문제 도전!)
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                <span className="text-xs text-slate-400 block">공격력</span>
                <span className="text-base font-bold text-rose-400">⚔️ {stats.totalAtk}</span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                <span className="text-xs text-slate-400 block">방어력</span>
                <span className="text-base font-bold text-blue-400">🛡️ {stats.totalDef}</span>
              </div>
            </div>

            {/* Equipment */}
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

            {/* Potion */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧪</span>
                <span className="font-medium text-amber-300">체력 포션 (HP +100)</span>
              </div>
              <span className="font-bold text-amber-400 text-sm">{player.potions || 0} 개</span>
            </div>

          </div>
        </section>

        {/* Right Area */}
        <section className="lg:col-span-2 space-y-4">
          
          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab("hunt")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === "hunt" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>⚔️</span> 사냥터 (일반 구구단)
            </button>
            <button
              onClick={() => setActiveTab("shop")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === "shop" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>🛒</span> 상점 & 장비
            </button>
            <button
              onClick={() => setActiveTab("boss")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === "boss" ? "bg-rose-600 text-white shadow-md animate-pulse" : "text-rose-400 hover:text-rose-300 hover:bg-slate-800/50"
              }`}
            >
              <span>👑</span> 보스 레이드 (랜덤 특수공격)
            </button>
          </div>

          {/* TAB 1: HUNT */}
          {activeTab === "hunt" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="font-bold text-lg text-white">🌲 사냥터 (미니 몬스터)</h3>
              <p className="text-xs text-slate-400">일반 몬스터 사냥 시 스킬/방어 시 1자리 구구단 문제가 출제됩니다.</p>

              <div className="space-y-4">
                {HUNTING_GROUNDS.map((zone) => {
                  const isLocked = player.level < zone.reqLevel;
                  return (
                    <div
                      key={zone.id}
                      className={`p-4 rounded-xl border transition ${
                        isLocked ? "bg-slate-900/40 border-slate-800/60 opacity-60" : "bg-slate-800/40 border-slate-700/60"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-200 mb-3">
                        {zone.name} {isLocked && <span className="text-xs text-amber-500 font-semibold">[🔒 Lv.{zone.reqLevel} 필요]</span>}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {zone.monsters.map((monster) => (
                          <div key={monster.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-2xl">{monster.icon}</span>
                              <div>
                                <p className="font-semibold text-slate-200">{monster.name}</p>
                                <p className="text-[10px] text-slate-400">💰 {monster.goldReward}G / 🌟 {monster.xpReward}XP</p>
                              </div>
                            </div>
                            <button
                              disabled={isLocked}
                              onClick={() => startBattle(monster, false)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-extrabold text-xs transition"
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
          )}

          {/* TAB 2: SHOP */}
          {activeTab === "shop" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">🛒 상점</h3>
                <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
                  <button onClick={() => setShopCategory("weapons")} className={`px-3 py-1 rounded-lg text-xs font-bold ${shopCategory === "weapons" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>무기</button>
                  <button onClick={() => setShopCategory("armors")} className={`px-3 py-1 rounded-lg text-xs font-bold ${shopCategory === "armors" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>갑옷</button>
                  <button onClick={() => setShopCategory("items")} className={`px-3 py-1 rounded-lg text-xs font-bold ${shopCategory === "items" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>소모품</button>
                </div>
              </div>

              {shopCategory === "weapons" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WEAPONS.map((item) => {
                    const isEquipped = player.equippedWeaponId === item.id;
                    const isOwned = player.ownedWeaponIds.includes(item.id);
                    const isLevelLocked = player.level < item.reqLevel;
                    return (
                      <div key={item.id} className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${isEquipped ? "bg-amber-500/10 border-amber-500/50" : "bg-slate-800/40 border-slate-700/50"}`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <p className="font-bold text-sm text-white">{item.name}</p>
                            <p className="text-xs text-rose-400 font-semibold">공격력 +{item.atk}</p>
                            <p className="text-[11px] text-slate-400">착용 레벨: Lv.{item.reqLevel}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-700/40 pt-3">
                          <span className="text-xs font-bold text-amber-400">{item.price === 0 ? "기본 제공" : `${item.price.toLocaleString()} G`}</span>
                          {isEquipped ? <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold">장착 중</span> : isOwned ? <button onClick={() => setPlayer({ ...player, equippedWeaponId: item.id })} className="px-3 py-1 bg-slate-700 text-white rounded-lg text-xs font-bold">장착하기</button> : <button disabled={isLevelLocked || player.gold < item.price} onClick={() => handleBuyWeapon(item)} className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-extrabold">{isLevelLocked ? `Lv.${item.reqLevel} 필요` : "구매하기"}</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {shopCategory === "armors" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ARMORS.map((item) => {
                    const isEquipped = player.equippedArmorId === item.id;
                    const isOwned = player.ownedArmorIds.includes(item.id);
                    const isLevelLocked = player.level < item.reqLevel;
                    return (
                      <div key={item.id} className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${isEquipped ? "bg-amber-500/10 border-amber-500/50" : "bg-slate-800/40 border-slate-700/50"}`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <p className="font-bold text-sm text-white">{item.name}</p>
                            <p className="text-xs text-blue-400 font-semibold">방어력 +{item.def} / HP +{item.hpBonus}</p>
                            <p className="text-[11px] text-slate-400">착용 레벨: Lv.{item.reqLevel}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-700/40 pt-3">
                          <span className="text-xs font-bold text-amber-400">{item.price === 0 ? "기본 제공" : `${item.price.toLocaleString()} G`}</span>
                          {isEquipped ? <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold">장착 중</span> : isOwned ? <button onClick={() => setPlayer({ ...player, equippedArmorId: item.id })} className="px-3 py-1 bg-slate-700 text-white rounded-lg text-xs font-bold">장착하기</button> : <button disabled={isLevelLocked || player.gold < item.price} onClick={() => handleBuyArmor(item)} className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-extrabold">{isLevelLocked ? `Lv.${item.reqLevel} 필요` : "구매하기"}</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {shopCategory === "items" && (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🧪</span>
                    <div>
                      <p className="font-bold text-sm text-white">체력 포션 (HP +100)</p>
                      <p className="text-xs text-amber-400 font-bold mt-1">가격: 50 G</p>
                    </div>
                  </div>
                  <button disabled={player.gold < 50} onClick={handleBuyPotion} className="px-4 py-2 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl">구매하기 (+1)</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BOSS */}
          {activeTab === "boss" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="font-extrabold text-xl text-rose-400">👑 보스 토벌전 (랜덤 특수공격 패턴)</h3>
              <p className="text-xs text-slate-400">
                🔥 보스는 3턴 이후부터 기본 공격 및 강력한 특수 공격(1.5배)을 랜덤 시전합니다! (연속 시전 불가)
              </p>

              <div className="space-y-4">
                {BOSSES.map((boss) => {
                  const isLocked = player.level < boss.reqLevel;
                  const isDefeated = player.defeatedBossIds.includes(boss.id);
                  return (
                    <div key={boss.id} className="p-5 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/30 to-slate-900 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{boss.icon}</span>
                        <div>
                          <h4 className="font-black text-lg text-white">{boss.name} <span className="text-xs text-rose-300">Lv.{boss.reqLevel}</span></h4>
                          <p className="text-xs text-slate-300 mt-0.5">{boss.desc}</p>
                          <p className="text-[11px] text-rose-400 font-semibold mt-1">
                            🔥 특수 공격 조건: 3턴 이후 50% 확률 발동 (연속 발동 불가)
                          </p>
                        </div>
                      </div>
                      <button disabled={isLocked} onClick={() => startBattle(boss, true)} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-extrabold text-xs rounded-xl">
                        {isLocked ? `🔒 Lv.${boss.reqLevel} 해금` : isDefeated ? "재도전!" : "레이드 입장!"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </section>
      </main>

      {/* 🔴 INN REST 10-QUESTION QUIZ CHALLENGE MODAL */}
      {innChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-emerald-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in">
            
            <div className="text-center">
              <div className="inline-block p-3 rounded-full bg-emerald-500/20 text-emerald-400 text-3xl mb-2">
                🍺
              </div>
              <h3 className="text-xl font-black text-white">마을 여관 구구단 시험</h3>
              <p className="text-xs text-slate-400 mt-1">10문제 중 6문제 이상 맞히면 체력이 100% 회복됩니다!</p>
            </div>

            {!innChallenge.isComplete ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-emerald-400">문제 {innChallenge.currentIndex + 1} / 10</span>
                  <span className="text-amber-400">현재 맞힌 개수: {innChallenge.correctCount}개 (목표: 6개+)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${((innChallenge.currentIndex) / 10) * 100}%` }}></div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 text-4xl font-black text-emerald-400 text-center tracking-wider font-mono shadow-inner">
                  {innChallenge.questions[innChallenge.currentIndex].num1} × {innChallenge.questions[innChallenge.currentIndex].num2} = ?
                </div>

                <form onSubmit={handleInnQuestionSubmit} className="space-y-3">
                  <input
                    type="number"
                    autoFocus
                    placeholder="정답 입력"
                    value={innChallenge.userAnswer}
                    onChange={(e) => setInnChallenge({ ...innChallenge, userAnswer: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl py-3 px-4 text-center font-bold text-2xl text-white outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInnChallenge(null)}
                      className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs hover:bg-slate-700 transition"
                    >
                      포기하기
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg"
                    >
                      제출 (Next ➔)
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center space-y-4 py-2">
                {innChallenge.isSuccess ? (
                  <div className="space-y-3">
                    <div className="text-5xl">🎉</div>
                    <h4 className="text-2xl font-black text-emerald-400">여관 휴식 성공!</h4>
                    <p className="text-sm text-slate-200">
                      10문제 중 <span className="font-bold text-amber-400">{innChallenge.correctCount}개</span>를 맞히셨습니다!
                    </p>
                    <p className="text-xs text-emerald-300 font-bold bg-emerald-500/20 py-2 rounded-xl border border-emerald-500/30">
                      💖 체력이 100% 회복되었습니다!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-5xl">❌</div>
                    <h4 className="text-2xl font-black text-rose-400">여관 휴식 실패...</h4>
                    <p className="text-sm text-slate-200">
                      10문제 중 <span className="font-bold text-rose-400">{innChallenge.correctCount}개</span>만 맞혔습니다.
                    </p>
                    <p className="text-xs text-rose-300 font-semibold bg-rose-500/20 py-2 rounded-xl border border-rose-500/30">
                      (6개 이상 맞혀야 휴식이 가능합니다.)
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setInnChallenge(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition mt-2"
                >
                  확인 (마을로)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 🔴 BATTLE MATH QUIZ MODAL */}
      {quizModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`bg-slate-900 border-4 ${quizModal.isBoss ? "border-rose-500 shadow-rose-500/20" : "border-amber-500"} rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in fade-in`}>
            <div className={`inline-block p-3 rounded-full ${quizModal.isBoss ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"} text-3xl mb-1`}>
              {quizModal.actionType === "skill" ? "✨" : "🛡️✨"}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                {quizModal.actionType === "skill" ? "필살기 발동 연산 퀴즈" : "특수 방어 발동 연산 퀴즈"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {quizModal.isBoss ? "🔥 [보스전 전용] 소수 연산 정답 시 기술이 성공합니다!" : "정답을 맞히면 기술이 성공적으로 발동합니다!"}
              </p>
            </div>

            <div className={`bg-slate-800 p-4 rounded-2xl border border-slate-700 text-3xl font-black ${quizModal.isBoss ? "text-rose-400" : "text-amber-400"} tracking-wider font-mono`}>
              {quizModal.questionText} = ?
            </div>

            <form onSubmit={handleQuizSubmit} className="space-y-3">
              <input
                type="number"
                step="any"
                autoFocus
                placeholder="정답 입력 (소수/자연수)"
                value={quizModal.userAnswer}
                onChange={(e) => setQuizModal({ ...quizModal, userAnswer: e.target.value })}
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-500 rounded-xl py-3 px-4 text-center font-bold text-xl text-white outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuizModal(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 rounded-xl ${quizModal.isBoss ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-amber-500 hover:bg-amber-400 text-slate-950"} font-black text-xs transition shadow-lg`}
                >
                  시전하기!
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 RETRO POKÉMON BATTLE SCREEN MODAL */}
      {battle && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none">
          <div className="w-full max-w-2xl bg-amber-950/90 border-4 border-amber-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-mono border-double">
            
            {/* 1. TOP BATTLE SCENE */}
            <div className="relative bg-gradient-to-b from-amber-200 via-amber-100 to-amber-300 p-6 min-h-[300px] flex flex-col justify-between overflow-hidden shadow-inner">
              
              {/* ENEMY STATUS BADGE */}
              <div className={`self-start bg-slate-100 border-4 border-slate-800 rounded-2xl px-4 py-2 shadow-xl min-w-[220px] transition-transform ${hitEffect === 'enemy' ? 'animate-bounce' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-xs text-slate-900 tracking-wider flex items-center gap-1">
                    {battle.target.icon} {battle.target.name}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">Lv.{battle.target.reqLevel || 1}</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-900">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getHpBarColor(battle.enemyHp, battle.maxEnemyHp)}`}
                    style={{ width: `${Math.max(0, (battle.enemyHp / battle.maxEnemyHp) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* ENEMY SPRITE */}
              <div className={`absolute top-10 right-10 flex flex-col items-center transition-all ${hitEffect === 'enemy' ? 'animate-ping' : ''}`}>
                <div className="w-36 h-12 bg-amber-400/40 rounded-[100%] border-2 border-amber-500/50 transform rotate-12 -mb-6 shadow-md"></div>
                <div className="text-6xl sm:text-7xl filter drop-shadow-2xl animate-pulse">
                  {battle.target.icon}
                </div>
              </div>

              {/* PLAYER SPRITE */}
              <div className={`absolute bottom-6 left-10 flex flex-col items-center transition-all ${hitEffect === 'player' ? 'animate-ping' : ''}`}>
                <div className="text-6xl sm:text-7xl filter drop-shadow-2xl transform -scale-x-100">
                  🧙‍♂️
                </div>
                <div className="w-36 h-12 bg-amber-400/40 rounded-[100%] border-2 border-amber-500/50 transform -rotate-12 -mt-4 shadow-md"></div>
              </div>

              {/* PLAYER STATUS BADGE */}
              <div className={`self-end bg-slate-100 border-4 border-slate-800 rounded-2xl px-4 py-2 shadow-xl min-w-[240px] mt-16 transition-transform ${hitEffect === 'player' ? 'animate-bounce' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-xs text-slate-900 tracking-wider">
                    모험가 (Player)
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">Lv.{stats.level}</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-900">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getHpBarColor(battle.playerHp, stats.maxHp)}`}
                    style={{ width: `${Math.max(0, (battle.playerHp / stats.maxHp) * 100)}%` }}
                  ></div>
                </div>
                <div className="text-right text-[11px] font-extrabold text-slate-800 mt-0.5">
                  {battle.playerHp} / {stats.maxHp} HP
                </div>
              </div>

            </div>

            {/* 2. MIDDLE TEXT BANNER */}
            <div className="bg-slate-900 border-t-4 border-b-4 border-slate-800 p-4 min-h-[72px] flex items-center justify-between">
              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                {battleText || `${battle.target.name}(이)가 등장했다!`}
              </p>
              <span className="text-xs font-semibold text-amber-400 animate-bounce">▼</span>
            </div>

            {/* 3. BOTTOM COMMAND BUTTONS */}
            {!battle.isOver ? (
              <div className="bg-slate-800 p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => executeTurn("attack")}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 px-3 rounded-2xl border-4 border-rose-800 shadow-lg flex items-center justify-between transition active:scale-95 text-xs"
                >
                  <span>⚔️ 일반 공격</span>
                  <span className="text-[10px] bg-rose-800 px-1.5 py-0.5 rounded text-rose-200">기본</span>
                </button>

                <button
                  onClick={() => executeTurn("defend")}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 px-3 rounded-2xl border-4 border-blue-800 shadow-lg flex items-center justify-between transition active:scale-95 text-xs"
                >
                  <span>🛡️ 방어</span>
                  <span className="text-[10px] bg-blue-800 px-1.5 py-0.5 rounded text-blue-200">0.5배피해</span>
                </button>

                <button
                  disabled={battle.specialDefCooldown > 0}
                  onClick={handleOpenSpecialDefendQuiz}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:border-slate-800 disabled:text-slate-500 text-white font-black py-2.5 px-3 rounded-2xl border-4 border-cyan-800 shadow-lg flex items-center justify-between transition active:scale-95 text-xs"
                >
                  <span>🛡️✨ 특수 방어</span>
                  <span className="text-[10px] bg-cyan-900 text-cyan-200 px-1.5 py-0.5 rounded">
                    {battle.specialDefCooldown > 0 ? `${battle.specialDefCooldown}턴 쿨` : "0.1배(90%차단)"}
                  </span>
                </button>

                <button
                  disabled={battle.skillCooldown > 0}
                  onClick={handleOpenSkillQuiz}
                  className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:border-slate-800 disabled:text-slate-500 text-slate-950 font-black py-2.5 px-3 rounded-2xl border-4 border-amber-700 shadow-lg flex items-center justify-between transition active:scale-95 text-xs"
                >
                  <span>✨ 필살기</span>
                  <span className="text-[10px] bg-amber-700 text-amber-100 px-1.5 py-0.5 rounded">
                    {battle.skillCooldown > 0 ? `${battle.skillCooldown}턴 쿨` : "1.5배DMG"}
                  </span>
                </button>

                <button
                  onClick={() => executeTurn("potion")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-3 rounded-2xl border-4 border-emerald-800 shadow-lg flex items-center justify-between transition active:scale-95 text-xs sm:col-span-2"
                >
                  <span>🧪 포션 (ITEM)</span>
                  <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded text-emerald-200">{player.potions}개 (+100 HP)</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-800 p-3">
                <button
                  onClick={() => setBattle(null)}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl border-4 border-amber-600 shadow-lg text-sm transition"
                >
                  전투 완료 (마을로 돌아가기)
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
