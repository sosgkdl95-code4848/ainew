"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";

export default function Home() {
  const [status, setStatus] = useState("idle");
  const isEnvConfigured = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "your_api_key_here";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center max-w-2xl mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-4">
          🔥 Firebase + Next.js 연동 프로젝트
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
          ainew 프로젝트
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Next.js App Router와 Firebase SDK 연동 준비가 완료되었습니다.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <span className="text-slate-300 font-medium text-sm">Firebase 설정 상태</span>
          {isEnvConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ● 키 설정 완료
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ● API 키 입력 필요 (.env.local)
            </span>
          )}
        </div>

        {/* Step-by-Step Info */}
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
            <span className="font-bold text-amber-400">1</span>
            <div>
              <p className="font-semibold text-white">Firebase 콘솔 프로젝트 생성</p>
              <p className="text-xs text-slate-400 mt-0.5">
                console.firebase.google.com 에서 새 프로젝트를 생성하세요.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
            <span className="font-bold text-amber-400">2</span>
            <div>
              <p className="font-semibold text-white">.env.local 설정</p>
              <p className="text-xs text-slate-400 mt-0.5">
                발급받은 Firebase Config 키를 프로젝트 루트의 <code className="text-amber-300 font-mono">.env.local</code> 파일에 붙여넣으세요.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
            <span className="font-bold text-amber-400">3</span>
            <div>
              <p className="font-semibold text-white">Vercel 환경 변수 등록</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Vercel 프로젝트 설정(Environment Variables)에도 동일한 키들을 등록해주시면 실시간 배포 사이트에서도 작동합니다!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
