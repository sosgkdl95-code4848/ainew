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
  const [battle, setBattle] = useState(null);
  const [battleText, setBattleText] = useState("");
  const [saveNotification, setSaveNotification] = useState("");
  const [hitEffect, setHitEffect] = useState(null);

  // Math Quiz Modal State for Battle (Skill, SpecialDefend, QuizFlee)
  const [quizModal, setQuizModal] = useState(null);

  // Flee Choice Modal State (General Flee 30% vs Quiz Flee 50%)
  const [fleeChoiceModal, setFleeChoiceModal] = useState(false);

  // Step-by-Step Long Division Challenge State for Inn Rest
  const [innChallenge, setInnChallenge] = useState(null);

  // Stats
  const stats = calculatePlayerStats(player);
  const playerCurrentHp = player.currentHp !== undefined ? player.currentHp : stats.maxHp;

  // Auth Listener & Battle Restoration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const savedData = await loadGameData(currentUser.uid);
        if (savedData) {
          setPlayer(savedData);
          // Restoring active ongoing battle if user left mid-battle!
          if (savedData.activeBattle && !savedData.activeBattle.isOver) {
            setBattle(savedData.activeBattle);
            setBattleText(savedData.activeBattle.logs?.[0] || `${savedData.activeBattle.target?.name}(와)의 전투가 재개되었습니다!`);
          }
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

    const getReqXp = (lvl) => (lvl <= 10 ? lvl * 20 : lvl * 60);

    while (newXp >= getReqXp(newLevel) && newLevel < 20) {
      newXp -= getReqXp(newLevel);
      newLevel += 1;
      leveledUp = true;
    }

    if (leveledUp) {
      alert(`🎉 레벨 업! Lv.${newLevel} 달성! 체력이 100% 회복되고 스탯이 상승했습니다!`);
    }

    return { level: newLevel, xp: newXp, leveledUp };
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

  // Start Battle (Saves activeBattle to Firestore)
  const startBattle = (target, isBoss) => {
    if (isBoss && player.level < target.reqLevel) {
      alert(`🔒 ${target.name} 보스는 레벨 ${target.reqLevel} 이상부터 도전 가능합니다!`);
      return;
    }

    let startingHp = playerCurrentHp;
    if (startingHp <= 0) {
      startingHp = Math.round(stats.maxHp * 0.5);
      alert("🩹 체력이 0이었던 모험가가 50% 체력을 회복하고 전투에 진입합니다!");
    }

    const initialText = `${target.name}(이)가 무대에 등장했다! (현재 HP: ${startingHp} / ${stats.maxHp})`;
    setBattleText(initialText);

    const newBattle = {
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
      bossSpecialCooldown: 0,
    };

    const nextPlayerState = {
      ...player,
      currentHp: startingHp,
      activeBattle: newBattle,
    };

    setPlayer(nextPlayerState);
    setBattle(newBattle);
    handleSave(nextPlayerState);
  };

  // 🎲 TRULY RANDOM ELEMENTARY SCHOOL MATH PROBLEM GENERATOR
  const generateBattleMathProblem = () => {
    const type = Math.floor(Math.random() * 7);

    if (type === 0) {
      const n1 = Math.floor(Math.random() * 15) + 2;
      const n2 = Math.floor(Math.random() * 9) + 2;
      return { questionText: `${n1} × ${n2}`, answer: n1 * n2, typeName: "자연수 곱셈" };
    } else if (type === 1) {
      const ans = Math.floor(Math.random() * 12) + 2;
      const divisor = Math.floor(Math.random() * 9) + 2;
      const dividend = ans * divisor;
      return { questionText: `${dividend} ÷ ${divisor}`, answer: ans, typeName: "자연수 나눗셈" };
    } else if (type === 2) {
      const isAdd = Math.random() < 0.5;
      if (isAdd) {
        const n1 = Math.floor(Math.random() * 300) + 15;
        const n2 = Math.floor(Math.random() * 300) + 15;
        return { questionText: `${n1} + ${n2}`, answer: n1 + n2, typeName: "자연수 덧셈" };
      } else {
        const n1 = Math.floor(Math.random() * 400) + 100;
        const n2 = Math.floor(Math.random() * (n1 - 10)) + 10;
        return { questionText: `${n1} - ${n2}`, answer: n1 - n2, typeName: "자연수 뺄셈" };
      }
    } else if (type === 3) {
      const factor1 = Math.round((Math.floor(Math.random() * 40 + 2) * 0.25) * 100) / 100;
      const factor2 = [2, 4, 5, 8, 10][Math.floor(Math.random() * 5)];
      const ans = Math.round(factor1 * factor2 * 100) / 100;
      return { questionText: `${factor1} × ${factor2}`, answer: ans, typeName: "소수 곱셈" };
    } else if (type === 4) {
      const isDecimalDivisor = Math.random() < 0.3;
      if (isDecimalDivisor) {
        const ans = Math.floor(Math.random() * 15) + 2;
        const divisor = [0.2, 0.4, 0.5, 0.8][Math.floor(Math.random() * 4)];
        const dividend = Math.round(ans * divisor * 10) / 10;
        return { questionText: `${dividend} ÷ ${divisor}`, answer: ans, typeName: "소수 나눗셈" };
      } else {
        const ans = Math.round((Math.floor(Math.random() * 25 + 2) * 0.2) * 10) / 10;
        const divisor = Math.floor(Math.random() * 5) + 2;
        const dividend = Math.round(ans * divisor * 10) / 10;
        return { questionText: `${dividend} ÷ ${divisor}`, answer: ans, typeName: "소수 나눗셈" };
      }
    } else if (type === 5) {
      const n1 = Math.round((Math.floor(Math.random() * 45 + 5) * 0.1) * 10) / 10;
      const n2 = Math.round((Math.floor(Math.random() * 45 + 5) * 0.1) * 10) / 10;
      const ans = Math.round((n1 + n2) * 10) / 10;
      return { questionText: `${n1} + ${n2}`, answer: ans, typeName: "소수 덧셈" };
    } else {
      const n1 = Math.round((Math.floor(Math.random() * 50 + 20) * 0.1) * 10) / 10;
      const n2 = Math.round((Math.floor(Math.random() * (n1 * 10 - 5)) * 0.1) * 10) / 10;
      const ans = Math.round((n1 - n2) * 10) / 10;
      return { questionText: `${n1} - ${n2}`, answer: ans, typeName: "소수 뺄셈" };
    }
  };

  // Open Skill Quiz Modal
  const handleOpenSkillQuiz = () => {
    if (!battle || battle.isOver) return;
    if (battle.skillCooldown > 0) {
      alert(`⏳ 스킬 쿨타임 중입니다! (${battle.skillCooldown}턴 남음)`);
      return;
    }

    const problem = generateBattleMathProblem();
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

    const problem = generateBattleMathProblem();
    setQuizModal({
      actionType: "specialDefend",
      questionText: problem.questionText,
      answer: problem.answer,
      userAnswer: "",
      isBoss: battle.isBoss,
    });
  };

  // Open Flee Choice Modal
  const handleOpenFleeChoice = () => {
    if (!battle || battle.isOver) return;
    setFleeChoiceModal(true);
  };

  // General Flee (30% Probability)
  const handleGeneralFlee = () => {
    setFleeChoiceModal(false);
    executeTurn("generalFlee");
  };

  // Quiz Flee (50% Probability on Correct Answer)
  const handleOpenQuizFlee = () => {
    setFleeChoiceModal(false);
    const problem = generateBattleMathProblem();
    setQuizModal({
      actionType: "quizFlee",
      questionText: problem.questionText,
      answer: problem.answer,
      userAnswer: "",
      isBoss: battle.isBoss,
    });
  };

  // Submit Battle Math Quiz (Increments solvedMathCount on correct answer!)
  const handleQuizSubmit = (e) => {
    e.preventDefault();
    if (!quizModal) return;

    const userVal = parseFloat(quizModal.userAnswer);
    const isCorrect = Math.abs(userVal - quizModal.answer) < 0.001;
    const currentQuiz = quizModal;
    setQuizModal(null);

    if (isCorrect) {
      const updatedPlayer = {
        ...player,
        solvedMathCount: (player.solvedMathCount || 0) + 1,
      };
      setPlayer(updatedPlayer);
    }

    executeTurn(currentQuiz.actionType, isCorrect, currentQuiz);
  };

  // Generate Step-by-Step Long Division Problems by Level for Inn Rest
  const generateInnLongDivisionQuestion = (level) => {
    if (level <= 5) {
      const options = [
        { divisor: 2, dividend: 0.8, quotientStr: "0.4", d1: 0, d2: 8, q1: 0, q2: 4, rem1: 8 },
        { divisor: 3, dividend: 0.9, quotientStr: "0.3", d1: 0, d2: 9, q1: 0, q2: 3, rem1: 9 },
        { divisor: 4, dividend: 0.8, quotientStr: "0.2", d1: 0, d2: 8, q1: 0, q2: 2, rem1: 8 },
      ];
      const selected = options[Math.floor(Math.random() * options.length)];
      return {
        divisor: selected.divisor,
        dividend: selected.dividend,
        quotientStr: selected.quotientStr,
        steps: [
          { stepNum: 1, prompt: `1단계: 일의 자리 ${selected.d1}을 ${selected.divisor}로 나누면 몫의 일의 자리는 얼마일까요?`, targetInput: "0", hint: `${selected.d1} ÷ ${selected.divisor} = 0 입니다!`, label: "일의 자리 몫" },
          { stepNum: 2, prompt: `2단계: 나누어지는 수의 소수점 위치 그대로 위로 찍어볼까요? (소수점 '.' 입력)`, targetInput: ".", hint: "키보드의 마침표(.)를 입력하세요!", label: "소수점 위치" },
          { stepNum: 3, prompt: `3단계: 소수 첫째 자리 ${selected.d2}를 ${selected.divisor}로 나누면 몫은 얼마일까요? (${selected.d2} ÷ ${selected.divisor})`, targetInput: String(selected.q2), hint: `${selected.divisor} × ${selected.q2} = ${selected.d2} 입니다!`, label: "소수 첫째 자리 몫" },
        ],
      };
    } else if (level <= 10) {
      const options = [
        { divisor: 4, dividend: 0.72, quotientStr: "0.18", sub1: 4, rem1: 32, q1: 1, q2: 8 },
        { divisor: 3, dividend: 0.75, quotientStr: "0.25", sub1: 6, rem1: 15, q1: 2, q2: 5 },
        { divisor: 5, dividend: 0.85, quotientStr: "0.17", sub1: 5, rem1: 35, q1: 1, q2: 7 },
      ];
      const selected = options[Math.floor(Math.random() * options.length)];
      return {
        divisor: selected.divisor,
        dividend: selected.dividend,
        quotientStr: selected.quotientStr,
        sub1: selected.sub1,
        rem1: selected.rem1,
        steps: [
          { stepNum: 1, prompt: `1단계: 일의 자리 0을 ${selected.divisor}로 나누면 몫의 일의 자리는?`, targetInput: "0", hint: "0 ÷ 4 = 0 입니다!", label: "일의 자리 몫" },
          { stepNum: 2, prompt: `2단계: 빨간 화살표처럼 소수점을 그대로 위로 찍어볼까요? ('.' 입력)`, targetInput: ".", hint: "소수점 '.'을 입력하세요!", label: "소수점 찍기" },
          { stepNum: 3, prompt: `3단계: 소수 첫째 자리 7을 ${selected.divisor}로 나누면 몫은 얼마일까요? (나머지 3)`, targetInput: String(selected.q1), hint: `${selected.divisor} × ${selected.q1} = ${selected.sub1} (7 - ${selected.sub1} = 3)`, label: "소수 첫째 자리 몫" },
          { stepNum: 4, prompt: `4단계: 나머지 3에 2를 내린 ${selected.rem1}를 ${selected.divisor}로 나누면 몫은 얼마일까요? (${selected.rem1} ÷ ${selected.divisor})`, targetInput: String(selected.q2), hint: `${selected.divisor} × ${selected.q2} = ${selected.rem1} 입니다!`, label: "소수 둘째 자리 몫" },
        ],
      };
    } else if (level <= 15) {
      const options = [
        { divisor: 6, dividend: 1.44, quotientStr: "0.24", sub1: 12, rem1: 24, q1: 2, q2: 4 },
        { divisor: 5, dividend: 3.75, quotientStr: "0.75", sub1: 35, rem1: 25, q1: 7, q2: 5 },
        { divisor: 8, dividend: 1.84, quotientStr: "0.23", sub1: 16, rem1: 24, q1: 2, q2: 3 },
      ];
      const selected = options[Math.floor(Math.random() * options.length)];
      return {
        divisor: selected.divisor,
        dividend: selected.dividend,
        quotientStr: selected.quotientStr,
        sub1: selected.sub1,
        rem1: selected.rem1,
        steps: [
          { stepNum: 1, prompt: `1단계: 일의 자리 몫은 0! [0]을 입력해보세요.`, targetInput: "0", hint: "1보다 큰 5로 나눌 수 없으므로 0입니다!", label: "일의 자리 몫" },
          { stepNum: 2, prompt: `2단계: 소수점을 잊지 않고 위에 찍어볼까요? ('.' 입력)`, targetInput: ".", hint: "소수점 '.'을 위치에 맞춰 찍습니다!", label: "소수점 위치" },
          { stepNum: 3, prompt: `3단계: 14를 ${selected.divisor}로 나눈 몫은 얼마일까요?`, targetInput: String(selected.q1), hint: `${selected.divisor} × ${selected.q1} = ${selected.sub1}`, label: "소수 첫째 자리 몫" },
          { stepNum: 4, prompt: `4단계: 나머지 ${selected.rem1}를 ${selected.divisor}로 나눈 몫은 얼마일까요?`, targetInput: String(selected.q2), hint: `${selected.divisor} × ${selected.q2} = ${selected.rem1}`, label: "소수 둘째 자리 몫" },
        ],
      };
    } else {
      const options = [
        { divisor: 4, dividend: 3.12, quotientStr: "0.78", sub1: 28, rem1: 32, q1: 7, q2: 8 },
        { divisor: 8, dividend: 3.36, quotientStr: "0.42", sub1: 32, rem1: 16, q1: 4, q2: 2 },
        { divisor: 9, dividend: 4.68, quotientStr: "0.52", sub1: 45, rem1: 18, q1: 5, q2: 2 },
      ];
      const selected = options[Math.floor(Math.random() * options.length)];
      return {
        divisor: selected.divisor,
        dividend: selected.dividend,
        quotientStr: selected.quotientStr,
        sub1: selected.sub1,
        rem1: selected.rem1,
        steps: [
          { stepNum: 1, prompt: `1단계: 일의 자리 몫 [0]을 입력해보세요!`, targetInput: "0", hint: "0 입니다!", label: "일의 자리 몫" },
          { stepNum: 2, prompt: `2단계: 소수점 '.'을 올바른 위치에 찍어볼까요?`, targetInput: ".", hint: "소수점 '.'을 입력하세요!", label: "소수점 위치" },
          { stepNum: 3, prompt: `3단계: 소수 첫째 자리 몫을 구해볼까요?`, targetInput: String(selected.q1), hint: `${selected.divisor} × ${selected.q1} = ${selected.sub1}`, label: "소수 첫째 자리 몫" },
          { stepNum: 4, prompt: `4단계: 나머지 ${selected.rem1}를 ${selected.divisor}로 나눈 몫은?`, targetInput: String(selected.q2), hint: `${selected.divisor} × ${selected.q2} = ${selected.rem1}`, label: "소수 둘째 자리 몫" },
        ],
      };
    }
  };

  // Open Inn Rest Challenge
  const handleStartInnChallenge = () => {
    if (playerCurrentHp >= stats.maxHp) {
      alert("이미 체력이 가득 차있습니다!");
      return;
    }

    const totalQCount = player.level <= 10 ? 1 : 2;
    const questions = Array.from({ length: totalQCount }, () => generateInnLongDivisionQuestion(player.level));

    setInnChallenge({
      questions,
      currentQIndex: 0,
      currentStepIndex: 0,
      userStepInput: "",
      completedStepInputs: [],
      isComplete: false,
      isSuccess: false,
      feedbackMsg: questions[0].steps[0].prompt,
    });
  };

  // Submit Step Input in Inn Challenge (Increments solvedMathCount!)
  const handleInnStepSubmit = (e) => {
    e.preventDefault();
    if (!innChallenge || innChallenge.isComplete) return;

    const currentQ = innChallenge.questions[innChallenge.currentQIndex];
    const currentStep = currentQ.steps[innChallenge.currentStepIndex];

    const inputVal = innChallenge.userStepInput.trim();
    if (inputVal === currentStep.targetInput) {
      const newCompleted = [...innChallenge.completedStepInputs, inputVal];
      const nextStepIdx = innChallenge.currentStepIndex + 1;

      // Increment solved Math count for correct step!
      const updatedMathCount = (player.solvedMathCount || 0) + 1;

      if (nextStepIdx >= currentQ.steps.length) {
        const nextQIdx = innChallenge.currentQIndex + 1;
        if (nextQIdx >= innChallenge.questions.length) {
          setInnChallenge({
            ...innChallenge,
            completedStepInputs: newCompleted,
            isComplete: true,
            isSuccess: true,
            feedbackMsg: "🎉 축하합니다! 모든 소수의 나눗셈 단계를 통과하여 체력이 100% 회복되었습니다!",
          });

          const nextPlayer = { ...player, currentHp: stats.maxHp, solvedMathCount: updatedMathCount };
          setPlayer(nextPlayer);
          handleSave(nextPlayer);
        } else {
          const nextQ = innChallenge.questions[nextQIdx];
          const nextPlayer = { ...player, solvedMathCount: updatedMathCount };
          setPlayer(nextPlayer);

          setInnChallenge({
            ...innChallenge,
            currentQIndex: nextQIdx,
            currentStepIndex: 0,
            userStepInput: "",
            completedStepInputs: [],
            feedbackMsg: `👏 1번 문제 완벽 통과! 2번 문제로 넘어갑니다!\n${nextQ.steps[0].prompt}`,
          });
        }
      } else {
        const nextStep = currentQ.steps[nextStepIdx];
        const nextPlayer = { ...player, solvedMathCount: updatedMathCount };
        setPlayer(nextPlayer);

        setInnChallenge({
          ...innChallenge,
          currentStepIndex: nextStepIdx,
          userStepInput: "",
          completedStepInputs: newCompleted,
          feedbackMsg: `✨ 정답입니다! 아주 훌륭해요!\n${nextStep.prompt}`,
        });
      }
    } else {
      setInnChallenge({
        ...innChallenge,
        feedbackMsg: `❌ 아쉽네요! 힌트: ${currentStep.hint}\n다시 한 번 입력해볼까요? (${currentStep.prompt})`,
      });
    }
  };

  // Turn Action Logic for Battle (With Active Battle State Persistence & Gold/Math Tracking)
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
      
      const updatedBattle = { ...battle, playerHp: currentPlayerHp, logs: newLogs };
      const nextPlayer = { ...player, potions: player.potions - 1, currentHp: currentPlayerHp, activeBattle: updatedBattle };
      setPlayer(nextPlayer);
      setBattle(updatedBattle);
      handleSave(nextPlayer);
    } else if (actionType === "generalFlee") {
      const fleeSuccess = Math.random() < 0.3;
      if (fleeSuccess) {
        const text = `🏃 [30% 확률 성공!] 도망치기에 성공하여 안전하게 마을로 탈출했습니다!`;
        setBattleText(text);
        newLogs.unshift(`[Turn ${battle.turn}] ${text}`);

        const endedBattle = { ...battle, logs: newLogs, isOver: true, isWin: false };
        const nextPlayer = { ...player, activeBattle: null };
        setPlayer(nextPlayer);
        setBattle(endedBattle);
        handleSave(nextPlayer);
        return;
      } else {
        const text = `❌ [30% 확률 실패!] 도망치기에 실패하여 발이 묶였습니다! 턴이 넘어갑니다.`;
        setBattleText(text);
        newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
      }
    } else if (actionType === "quizFlee") {
      if (quizSuccess) {
        const fleeSuccess = Math.random() < 0.5;
        if (fleeSuccess) {
          const text = `🎉 [정답! ${quizData.questionText} = ${quizData.answer}] 🏃 [50% 확률 성공!] 도망치기에 성공하여 무사히 탈출했습니다!`;
          setBattleText(text);
          newLogs.unshift(`[Turn ${battle.turn}] ${text}`);

          const endedBattle = { ...battle, logs: newLogs, isOver: true, isWin: false };
          const nextPlayer = { ...player, activeBattle: null };
          setPlayer(nextPlayer);
          setBattle(endedBattle);
          handleSave(nextPlayer);
          return;
        } else {
          const text = `❌ [정답! ${quizData.questionText} = ${quizData.answer}] 그러나 도망치기 확률(50%) 실패로 발이 묶였습니다! 턴이 넘어갑니다.`;
          setBattleText(text);
          newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
        }
      } else {
        const text = `❌ [퀴즈 오답! 문제: ${quizData.questionText}] 도망치기에 실패했습니다! 턴이 넘어갑니다.`;
        setBattleText(text);
        newLogs.unshift(`[Turn ${battle.turn}] ${text}`);
      }
    }

    // Check Enemy Defeat (Updates totalGoldEarned & monstersDefeated!)
    if (currentEnemyHp <= 0) {
      const earnedGold = battle.isBoss ? battle.target.rewardGold : battle.target.goldReward;
      const rawXp = battle.isBoss ? battle.target.rewardXp : battle.target.xpReward;

      const monsterLevel = battle.target.level || battle.target.reqLevel || 1;
      const levelDiff = player.level - monsterLevel;

      let earnedXp = rawXp;
      let penaltyMsg = "";
      if (levelDiff > 5) {
        earnedXp = Math.max(1, Math.floor(rawXp * 0.01));
        penaltyMsg = ` (⚠️ 레벨 차이 ${levelDiff} > 5 초과 패널티: 경험치 0.01배 +${earnedXp}XP 획득)`;
      }

      const winText = `🏆 ${battle.target.name}(을)를 물리쳤다! 승리!${penaltyMsg}`;
      setBattleText(winText);
      newLogs.unshift(winText);

      const { level: newLevel, xp: newXp, leveledUp } = checkLevelUp(player.xp + earnedXp, player.level);
      const newDefeatedBosses = battle.isBoss && !player.defeatedBossIds.includes(battle.target.id)
        ? [...player.defeatedBossIds, battle.target.id]
        : player.defeatedBossIds;

      const nextMaxHp = calculatePlayerStats({ ...player, level: newLevel }).maxHp;
      const finalHp = leveledUp ? nextMaxHp : currentPlayerHp;

      const endedBattle = {
        ...battle,
        enemyHp: 0,
        playerHp: finalHp,
        logs: newLogs,
        isOver: true,
        isWin: true,
      };

      const nextPlayerState = {
        ...player,
        gold: player.gold + earnedGold,
        totalGoldEarned: (player.totalGoldEarned || player.gold) + earnedGold,
        monstersDefeated: (player.monstersDefeated || 0) + 1,
        xp: newXp,
        level: newLevel,
        currentHp: finalHp,
        defeatedBossIds: newDefeatedBosses,
        activeBattle: null,
      };

      setPlayer(nextPlayerState);
      setBattle(endedBattle);
      handleSave(nextPlayerState);
      return;
    }

    // 2. ENEMY COUNTER ATTACK
    setTimeout(() => {
      setHitEffect("player");
      setTimeout(() => setHitEffect(null), 500);

      let isBossSpecialAttack = false;
      const currentBossCooldown = battle.bossSpecialCooldown || 0;

      if (battle.isBoss && battle.turn >= 3 && currentBossCooldown === 0) {
        isBossSpecialAttack = Math.random() < 0.5;
      }

      let nextBossSpecialCooldown = currentBossCooldown > 0 ? currentBossCooldown - 1 : 0;
      if (isBossSpecialAttack) {
        nextBossSpecialCooldown = 3;
      }

      let bossAttackMultiplier = isBossSpecialAttack ? 1.5 : 1.0;
      let rawEnemyDamage = calculateDamage(battle.target.atk * bossAttackMultiplier, stats.totalDef);
      let finalEnemyDamage = Math.max(1, Math.round(rawEnemyDamage * defenseMultiplier));

      const nextPlayerHp = Math.max(0, currentPlayerHp - finalEnemyDamage);
      
      let enemyText = "";
      if (isBossSpecialAttack) {
        const showWarningTag = (battle.target.reqLevel || 10) < 15;
        if (showWarningTag) {
          enemyText = `🔥 [보스 특수 스킬 공격!] ${battle.target.name}의 분노한 필살 공격! 모험가에게 ${finalEnemyDamage} 데미지! ${
            defenseMultiplier === 0.1 ? "(특수 방어 성공: 데미지 90% 차단!)" : defenseMultiplier === 0.5 ? "(일반 방어: 데미지 50% 감쇄)" : ""
          }`;
        } else {
          enemyText = `💥 ${battle.target.name}의 치명적인 일격! 모험가에게 ${finalEnemyDamage} 데미지! ${
            defenseMultiplier === 0.1 ? "(특수 방어 성공: 데미지 90% 차단!)" : defenseMultiplier === 0.5 ? "(일반 방어: 데미지 50% 감쇄)" : ""
          }`;
        }
      } else {
        enemyText = `💥 ${battle.target.name}의 기본 공격! 모험가에게 ${finalEnemyDamage} 데미지! ${
          defenseMultiplier === 0.1 ? "(특수 방어 성공: 데미지 90% 차단!)" : defenseMultiplier === 0.5 ? "(일반 방어: 데미지 50% 감쇄)" : ""
        }`;
      }

      setBattleText(enemyText);
      newLogs.unshift(`[Turn ${battle.turn}] ${enemyText}`);

      if (nextPlayerHp <= 0) {
        const xpPenalty = Math.floor(player.xp * 0.2);
        const remainingXp = Math.max(0, player.xp - xpPenalty);
        const respawnHp = Math.round(stats.maxHp * 0.5);

        const loseText = `💀 모험가가 쓰러졌습니다... (경험치 -${xpPenalty}XP [20% 감소], 마을에서 50% 체력으로 복구됩니다)`;
        setBattleText(loseText);
        newLogs.unshift(loseText);

        const endedBattle = {
          ...battle,
          enemyHp: currentEnemyHp,
          playerHp: 0,
          logs: newLogs,
          isOver: true,
          isWin: false,
        };

        const respawnState = {
          ...player,
          xp: remainingXp,
          currentHp: respawnHp,
          activeBattle: null,
        };
        setPlayer(respawnState);
        setBattle(endedBattle);
        handleSave(respawnState);

      } else {
        const updatedBattle = {
          ...battle,
          enemyHp: currentEnemyHp,
          playerHp: nextPlayerHp,
          logs: newLogs,
          turn: battle.turn + 1,
          skillCooldown: nextSkillCooldown,
          specialDefCooldown: nextSpecialDefCooldown,
          bossSpecialCooldown: nextBossSpecialCooldown,
        };

        const nextPlayerState = {
          ...player,
          currentHp: nextPlayerHp,
          activeBattle: updatedBattle,
        };

        setPlayer(nextPlayerState);
        setBattle(updatedBattle);
        handleSave(nextPlayerState);
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

  // Math Title helper based on solvedMathCount
  const getMathTitle = (count = 0) => {
    if (count >= 50) return { title: "👑 전설의 수학 마스터", color: "text-amber-300 bg-amber-500/20 border-amber-500/40" };
    if (count >= 30) return { title: "✨ 셈법의 대마법사", color: "text-purple-300 bg-purple-500/20 border-purple-500/40" };
    if (count >= 15) return { title: "⚔️ 수학의 수호 기사", color: "text-blue-300 bg-blue-500/20 border-blue-500/40" };
    if (count >= 5) return { title: "📐 소수 연산 탐험가", color: "text-emerald-300 bg-emerald-500/20 border-emerald-500/40" };
    return { title: "🌱 신입 수학 모험가", color: "text-slate-300 bg-slate-800 border-slate-700" };
  };

  // 1. INITIAL LOADING SCREEN
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans p-4">
        <div className="text-5xl animate-bounce mb-4">🧙‍♂️</div>
        <p className="text-lg font-bold text-amber-400">모험 준비 중...</p>
      </div>
    );
  }

  // 2. INITIAL LOGIN GATEWAY SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden select-none">
        
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border-4 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center z-10 relative backdrop-blur-md">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wider">
              <span>⚔️</span> 포켓몬 스타일 수학 RPG
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              ainew RPG
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              초등 수학 연산과 함께 전설의 보스를 토벌하는 모험을 시작하세요!
            </p>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex items-center justify-center gap-6 shadow-inner">
            <span className="text-5xl filter drop-shadow-lg animate-bounce">🧙‍♂️</span>
            <span className="text-2xl text-amber-500 font-bold">VS</span>
            <span className="text-5xl filter drop-shadow-lg animate-pulse">👑👺</span>
          </div>

          <div className="text-left bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <span>☁️</span> <span><strong>구글 계정 연동</strong>: 자동 Firestore 세이브 지원</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span>📐</span> <span><strong>소수 나눗셈 세로셈</strong>: 여관 단계별 학습 체력 회복</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span>🏆</span> <span><strong>명예의 전당</strong>: 누적 골드 & 수학 해결 문제 기록</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleGoogleLogin}
              className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-sm transition shadow-xl flex items-center justify-center gap-3 active:scale-95 border-2 border-slate-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google 계정으로 시작하기 (자동 세이브)
            </button>

            <button
              onClick={handleAnonymousLogin}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs transition border border-slate-700 flex items-center justify-center gap-2 active:scale-95"
            >
              👤 익명 게스트로 시작하기
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            로그인하시면 플레이 데이터가 안전하게 보관됩니다.
          </p>

        </div>
      </div>
    );
  }

  const titleBadge = getMathTitle(player.solvedMathCount || 0);

  // 3. MAIN GAME SCREEN
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
            <p className="text-xs text-slate-400">🏆 명예의 전당 (누적 골드 & 수학 해결 문제 기록)</p>
          </div>
        </div>

        {/* Auth Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700">
            <span className="text-xs font-medium text-slate-300">
              {user.isAnonymous ? "👤 익명 게스트" : `🌐 ${user.displayName || user.email}`}
            </span>
            <button onClick={() => signOut(auth)} className="text-xs text-slate-400 hover:text-white underline">
              로그아웃
            </button>
          </div>
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
                <span className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border mb-1.5 ${titleBadge.color}`}>
                  {titleBadge.title}
                </span>
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
                className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40 text-white text-xs font-extrabold transition shadow flex items-center justify-center gap-1.5 active:scale-95"
              >
                🍺 마을 여관 휴식 {player.level <= 10 ? "(소수 나눗셈 세로셈 1문제)" : "(소수 나눗셈 세로셈 2문제)"}
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
          
          {/* Main Navigation Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab("hunt")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1 ${
                activeTab === "hunt" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>⚔️</span> 사냥터
            </button>
            <button
              onClick={() => setActiveTab("shop")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1 ${
                activeTab === "shop" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>🛒</span> 상점
            </button>
            <button
              onClick={() => setActiveTab("boss")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1 ${
                activeTab === "boss" ? "bg-rose-600 text-white shadow-md animate-pulse" : "text-rose-400 hover:text-rose-300 hover:bg-slate-800/50"
              }`}
            >
              <span>👑</span> 보스 레이드
            </button>
            <button
              onClick={() => setActiveTab("hallOfFame")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1 ${
                activeTab === "hallOfFame" ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md" : "text-amber-400 hover:text-amber-300 hover:bg-slate-800/50"
              }`}
            >
              <span>🏆</span> 명예의 전당
            </button>
          </div>

          {/* TAB 1: HUNT */}
          {activeTab === "hunt" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="font-bold text-lg text-white">🌲 사냥터 (미니 몬스터)</h3>
              <p className="text-xs text-slate-400">
                🎲 전투 중 창을 닫고 이탈하더라도 몬스터/플레이어 HP와 턴 수가 그대로 복원됩니다!
              </p>

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
                        {zone.monsters.map((monster) => {
                          const mLevel = monster.level || monster.reqLevel || 1;
                          const isXpPenalty = (player.level - mLevel) > 5;
                          return (
                            <div key={monster.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-2xl">{monster.icon}</span>
                                <div>
                                  <p className="font-semibold text-slate-200">{monster.name} <span className="text-[10px] text-slate-400">Lv.{mLevel}</span></p>
                                  <p className="text-[10px] text-slate-400">
                                    💰 {monster.goldReward}G / 🌟 {isXpPenalty ? <span className="text-rose-400 font-bold">0.01배 XP (레벨차 {player.level - mLevel})</span> : `${monster.xpReward}XP`}
                                  </p>
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
                          );
                        })}
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
              <h3 className="font-extrabold text-xl text-rose-400">👑 보스 토벌전 (사망 시 XP 20% 손실)</h3>
              <p className="text-xs text-slate-400">
                🔥 보스전에서 패배하여 쓰러질 경우 현재 경험치(XP)의 20%가 차감되므로 신중하게 도전하세요!
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
                            {boss.reqLevel >= 15 ? "😈 [고난도] 경고 없이 무작위 특수 공격 시전 (사용 후 3턴 쿨타임)" : "🔥 3턴 이후 경고 문구와 함께 특수 공격 50% 확률 시전"}
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

          {/* TAB 4: HALL OF FAME (🏆 명예의 전당) */}
          {activeTab === "hallOfFame" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
              
              {/* Header */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🏆</span>
                  <div>
                    <h3 className="font-black text-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      전설의 모험가 명예의 전당
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      수학 문제를 해결하고 골드를 모아 전설의 칭호를 획득하세요!
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Hall of Fame Stats */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">나의 누적 수호 기록</h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 space-y-1">
                    <span className="text-2xl">📐</span>
                    <span className="text-[11px] text-slate-400 block font-semibold">해결한 수학 문제</span>
                    <p className="text-lg font-black text-amber-300">
                      {(player.solvedMathCount || 0).toLocaleString()} 개
                    </p>
                  </div>

                  <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 space-y-1">
                    <span className="text-2xl">💰</span>
                    <span className="text-[11px] text-slate-400 block font-semibold">누적 획득 골드</span>
                    <p className="text-lg font-black text-amber-400">
                      {(player.totalGoldEarned || player.gold || 0).toLocaleString()} G
                    </p>
                  </div>

                  <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 space-y-1">
                    <span className="text-2xl">⚔️</span>
                    <span className="text-[11px] text-slate-400 block font-semibold">토벌한 몬스터</span>
                    <p className="text-lg font-black text-rose-400">
                      {(player.monstersDefeated || 0).toLocaleString()} 마리
                    </p>
                  </div>

                  <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 space-y-1">
                    <span className="text-2xl">👑</span>
                    <span className="text-[11px] text-slate-400 block font-semibold">격퇴한 보스</span>
                    <p className="text-lg font-black text-purple-300">
                      {player.defeatedBossIds?.length || 0} / 3 마리
                    </p>
                  </div>
                </div>
              </div>

              {/* Title Badge Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-yellow-950/40 border-2 border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <span className="text-5xl">🎖️</span>
                  <div>
                    <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">현재 모험가 칭호</span>
                    <h4 className="text-xl font-black text-white mt-0.5">{titleBadge.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      다음 칭호 달성까지 수학 문제 <strong className="text-amber-300">{Math.max(0, (player.solvedMathCount < 5 ? 5 : player.solvedMathCount < 15 ? 15 : player.solvedMathCount < 30 ? 30 : 50) - (player.solvedMathCount || 0))}개</strong> 남음!
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400">전국 수학 등급</span>
                  <p className="text-lg font-black text-amber-400">Top 1% 마스터</p>
                </div>
              </div>

              {/* Leaderboard Showcase */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">전국 영웅 명예의 전당 랭킹</h4>

                <div className="space-y-2">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🥇</span>
                      <div>
                        <p className="font-extrabold text-amber-300 text-sm">{user.displayName || "수학 챔피언"} <span className="text-xs text-slate-400 font-normal">(나)</span></p>
                        <p className="text-[11px] text-slate-400">Lv.{player.level} • {titleBadge.title}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-black text-amber-400">{(player.solvedMathCount || 0)}문제 해결</p>
                      <p className="text-[10px] text-slate-400">💰 {(player.totalGoldEarned || player.gold || 0).toLocaleString()}G</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🥈</span>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">전설의 길가메시</p>
                        <p className="text-[11px] text-slate-400">Lv.19 • ✨ 셈법의 대마법사</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-300">48문제 해결</p>
                      <p className="text-[10px] text-slate-400">💰 42,500G</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🥉</span>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">알렉산더 대왕</p>
                        <p className="text-[11px] text-slate-400">Lv.17 • ⚔️ 수학의 수호 기사</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-300">32문제 해결</p>
                      <p className="text-[10px] text-slate-400">💰 28,900G</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </section>
      </main>

      {/* 🏃 FLEE CHOICE MODAL */}
      {fleeChoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in fade-in select-none">
            <div className="inline-block p-3 rounded-full bg-amber-500/20 text-amber-400 text-3xl mb-1">
              🏃
            </div>
            <div>
              <h3 className="text-xl font-black text-white">전투 탈출 선택</h3>
              <p className="text-xs text-slate-400 mt-1">도망치기 방법을 선택하세요! (실패 시 턴이 넘어갑니다)</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGeneralFlee}
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-white font-extrabold text-sm transition flex items-center justify-between"
              >
                <span>🎲 일반 도망치기</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30">30% 확률 성공</span>
              </button>

              <button
                onClick={handleOpenQuizFlee}
                className="w-full py-3.5 px-4 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900/80 border-2 border-cyan-500/50 text-cyan-200 font-extrabold text-sm transition flex items-center justify-between"
              >
                <span>📐 연산 퀴즈 풀고 도망치기</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-lg border border-cyan-500/30">정답 시 50% 성공</span>
              </button>
            </div>

            <button
              onClick={() => setFleeChoiceModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-950 text-slate-400 text-xs font-bold hover:text-white transition"
            >
              취소 (전투로 돌아가기)
            </button>
          </div>
        </div>
      )}

      {/* 🔴 INN REST: STEP-BY-STEP DECIMAL LONG DIVISION INTERACTIVE MODAL */}
      {innChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-cyan-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in select-none">
            
            <div className="text-center">
              <div className="inline-block p-3 rounded-full bg-cyan-500/20 text-cyan-400 text-3xl mb-2">
                📐
              </div>
              <h3 className="text-xl font-black text-white">마을 여관 소수의 나눗셈 단계별 세로셈</h3>
              <p className="text-xs text-slate-400 mt-1">
                {player.level <= 10 ? "Lv.1~10: 1문제를 완성하면 체력 100% 회복!" : "Lv.11+: 2문제를 완성하면 체력 100% 회복!"}
              </p>
            </div>

            {!innChallenge.isComplete ? (
              <div className="space-y-4">
                
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-cyan-400">문제 {innChallenge.currentQIndex + 1} / {innChallenge.questions.length}</span>
                  <span className="text-amber-400">
                    현재 단계: {innChallenge.currentStepIndex + 1} / {innChallenge.questions[innChallenge.currentQIndex].steps.length} 단계
                  </span>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border-2 border-slate-800 font-mono text-slate-100 space-y-4 shadow-inner">
                  
                  <div className="flex flex-col items-center justify-center">
                    
                    <div className="flex items-center gap-1 text-2xl font-black tracking-widest text-cyan-400 border-b-4 border-slate-400 pb-1 px-4">
                      <span className="text-slate-500 text-sm mr-6">몫 ➔</span>
                      {innChallenge.questions[innChallenge.currentQIndex].steps.map((step, idx) => {
                        const isCompleted = idx < innChallenge.currentStepIndex;
                        const isCurrent = idx === innChallenge.currentStepIndex;

                        if (step.targetInput === ".") {
                          return (
                            <span key={idx} className="relative text-rose-400 font-black px-1 text-3xl">
                              .
                              <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-rose-500 text-xs animate-bounce">↑</span>
                            </span>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className={`w-9 h-11 flex items-center justify-center rounded-lg border-2 font-bold text-xl transition-all ${
                              isCompleted
                                ? "bg-slate-800 border-slate-600 text-slate-300"
                                : isCurrent
                                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse ring-4 ring-cyan-500/30"
                                : "bg-slate-900 border-slate-800 text-slate-700"
                            }`}
                          >
                            {isCompleted ? innChallenge.completedStepInputs[idx] : isCurrent ? "?" : ""}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 text-3xl font-black tracking-widest mt-2">
                      <span className="text-amber-400 font-bold text-2xl">
                        {innChallenge.questions[innChallenge.currentQIndex].divisor}
                      </span>
                      <span className="text-slate-500 text-2xl">)</span>
                      <span className="text-white tracking-widest font-mono">
                        {innChallenge.questions[innChallenge.currentQIndex].dividend}
                      </span>
                    </div>

                  </div>

                </div>

                <div className="bg-cyan-950/60 border-2 border-cyan-500/40 p-4 rounded-2xl space-y-1">
                  <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    💬 선생님의 친절한 단계별 가이드:
                  </p>
                  <p className="text-sm font-extrabold text-white leading-relaxed whitespace-pre-line">
                    {innChallenge.feedbackMsg}
                  </p>
                </div>

                <form onSubmit={handleInnStepSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyan-400">
                      파란색 박스에 들어갈 숫자를 입력하세요:
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder={innChallenge.questions[innChallenge.currentQIndex].steps[innChallenge.currentStepIndex].targetInput === "." ? "소수점 '.' 입력" : "숫자 입력"}
                      value={innChallenge.userStepInput}
                      onChange={(e) => setInnChallenge({ ...innChallenge, userStepInput: e.target.value })}
                      className="w-full bg-slate-950 border-4 border-cyan-500 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-500/40 rounded-2xl py-3.5 px-4 text-center font-black text-3xl text-cyan-300 outline-none transition shadow-lg font-mono"
                    />
                  </div>

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
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-1"
                    >
                      정답 확인 (Next ➔)
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="text-center space-y-4 py-3">
                <div className="text-6xl">🎉</div>
                <h4 className="text-2xl font-black text-cyan-400">여관 휴식 성공!</h4>
                <p className="text-sm text-slate-200">
                  소수의 나눗셈 세로셈 단계를 완벽히 통과하셨습니다!
                </p>
                <p className="text-xs text-emerald-300 font-bold bg-emerald-500/20 py-2.5 px-4 rounded-xl border border-emerald-500/30">
                  💖 체력이 100% (풀피)로 완전 회복되었습니다!
                </p>

                <button
                  onClick={() => setInnChallenge(null)}
                  className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition mt-2"
                >
                  확인 (마을로 돌아가기)
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
              {quizModal.actionType === "skill" ? "✨" : quizModal.actionType === "specialDefend" ? "🛡️✨" : "🏃"}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                {quizModal.actionType === "skill" ? "필살기 발동 연산 퀴즈" : quizModal.actionType === "specialDefend" ? "특수 방어 발동 연산 퀴즈" : "도망치기 연산 퀴즈 (정답 시 50% 성공)"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                🎲 초등 수학 과정 무작위 출제: 정답을 입력하세요!
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-3 rounded-2xl border-4 border-emerald-800 shadow-lg flex items-center justify-between transition active:scale-95 text-xs"
                >
                  <span>🧪 포션</span>
                  <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded text-emerald-200">{player.potions}개</span>
                </button>

                <button
                  onClick={handleOpenFleeChoice}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-black py-2.5 px-3 rounded-2xl border-4 border-purple-800 shadow-lg flex items-center justify-between transition active:scale-95 text-xs"
                >
                  <span>🏃 도망치기</span>
                  <span className="text-[10px] bg-purple-800 px-1.5 py-0.5 rounded text-purple-200">30%/50%</span>
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
