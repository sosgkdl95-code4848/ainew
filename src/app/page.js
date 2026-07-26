"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 구글 로그인
  const handleGoogleLogin = async () => {
    try {
      setError("");
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Firebase 콘솔에서 'Google 로그인' 제공업체를 활성화해주세요.");
      } else {
        setError(err.message || "구글 로그인에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 익명 로그인
  const handleAnonymousLogin = async () => {
    try {
      setError("");
      setLoading(true);
      await signInAnonymously(auth);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Firebase 콘솔에서 '익명 로그인' 제공업체를 활성화해주세요.");
      } else {
        setError(err.message || "익명 로그인에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);
    } catch (err) {
      console.error(err);
      setError("로그아웃 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none">
      {/* Header */}
      <div className="text-center max-w-2xl mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold mb-4 shadow-sm">
          🔥 Firebase Auth 연동 시스템
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-3 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
          ainew 대시보드
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Google 계정 로그인 및 익명 로그인을 지원합니다.
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl transition-all duration-300">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">인증 상태를 확인하고 있습니다...</p>
          </div>
        ) : user ? (
          /* Logged In View */
          <div className="space-y-6 text-center">
            <div className="relative inline-block">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User Avatar"}
                  className="w-24 h-24 rounded-full mx-auto border-4 border-amber-500/40 shadow-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl font-extrabold text-white border-4 border-amber-500/40 shadow-lg">
                  {user.isAnonymous ? "👤" : (user.displayName?.[0] || user.email?.[0] || "U")}
                </div>
              )}
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">
                  {user.isAnonymous ? "익명 사용자" : user.displayName || "로그인된 사용자"}
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  user.isAnonymous 
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
                    : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                }`}>
                  {user.isAnonymous ? "익명 계정" : "Google 계정"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono break-all">{user.email || `UID: ${user.uid}`}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 text-left text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">UID:</span>
                <span className="font-mono text-slate-200 truncate max-w-[200px]">{user.uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">로그인 유형:</span>
                <span className="font-medium text-amber-400">
                  {user.isAnonymous ? "Anonymous Auth" : "Google OAuth"}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all duration-200 border border-slate-700 hover:border-slate-600 active:scale-[0.98]"
            >
              로그아웃 (Sign Out)
            </button>
          </div>
        ) : (
          /* Login Buttons View */
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-1">시작하기</h2>
              <p className="text-xs text-slate-400">원하시는 로그인 방식을 선택해 주세요.</p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium text-center leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-3">
              {/* Google Sign-In Button */}
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google 계정으로 로그인
              </button>

              {/* Anonymous Sign-In Button */}
              <button
                onClick={handleAnonymousLogin}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 border border-slate-700 hover:border-slate-600 shadow-sm active:scale-[0.98]"
              >
                <span className="text-lg">👤</span>
                익명으로 시작하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
