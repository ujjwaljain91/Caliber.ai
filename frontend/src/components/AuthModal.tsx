"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal() {
  const router = useRouter();
  const {
    isAuthModalOpen,
    closeAuthModal,
    authStep,
    setAuthStep,
    pendingUser,
    login,
    register,
    verifyOTP,
  } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Lead Hiring Manager");
  const [showPassword, setShowPassword] = useState(false);

  // OTP State: 6 digits
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset inputs when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError("");
      setCountdown(30);
    }
  }, [isAuthModalOpen]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (authStep === "OTP" && countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [authStep, countdown]);

  if (!isAuthModalOpen) return null;

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    await login(email, password);
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !name) return;
    await register(name, email, password, role);
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value.slice(-1);
    setOtpDigits(newOtp);
    setOtpError("");

    // Auto-advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 filled
    if (newOtp.every((d) => d !== "")) {
      submitOTP(newOtp.join(""));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split("");
      setOtpDigits(digits);
      submitOTP(pasted);
    }
  }

  async function submitOTP(code: string) {
    setIsVerifying(true);
    setOtpError("");
    const success = await verifyOTP(code);
    setIsVerifying(false);
    if (success) {
      router.push("/?view=candidates");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("caliber-auth-success"));
      }
    } else {
      setOtpError("Invalid verification code. Please enter a 6-digit code.");
    }
  }

  function handleQuickDemoFill() {
    if (authStep === "OTP") {
      const demo = ["1", "2", "3", "4", "5", "6"];
      setOtpDigits(demo);
      submitOTP("123456");
    } else if (authStep === "LOGIN") {
      setEmail("alex.morgan@caliber.ai");
      setPassword("caliber2026demo");
      login("alex.morgan@caliber.ai", "caliber2026demo");
    } else {
      setName("Sarah Connor");
      setEmail("sarah.connor@cyberdyne.ai");
      setRole("Senior AI Architect");
      register("Sarah Connor", "sarah.connor@cyberdyne.ai", "caliber2026demo", "Senior AI Architect");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
      {/* Ambient Refraction Orbs behind modal */}
      <div className="absolute top-[20%] left-[30%] w-96 h-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none animate-orb-1" />
      <div className="absolute bottom-[20%] right-[30%] w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none animate-orb-2" />

      <div className="relative max-w-md w-full liquid-glass-elevated p-8 rounded-3xl shadow-2xl border border-white/15 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl liquid-glass-pill flex items-center justify-center text-muted/70 hover:text-text"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo-icon-clean.png"
            alt="Caliber AI"
            className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,64,0,0.4)]"
          />
        </div>

        {/* ─── MODE 1: LOGIN ─── */}
        {authStep === "LOGIN" && (
          <form onSubmit={handleLoginSubmit} className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-black text-text tracking-tight">Assessor Sign In</h2>
              <p className="text-xs text-muted/80 mt-1">Access candidate directories, live sessions &amp; scorecards</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-3 rounded-2xl liquid-glass text-sm text-text placeholder:text-muted/40 focus:outline-none focus:border-accent/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Password
                  </label>
                  <button type="button" className="text-[11px] text-accent hover:underline">
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 rounded-2xl liquid-glass text-sm text-text placeholder:text-muted/40 focus:outline-none focus:border-accent/40 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted/60 hover:text-text text-xs"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-accent text-white font-bold text-xs shadow-xl shadow-accent/25 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300"
              >
                Send Verification Code →
              </button>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="w-full py-2.5 rounded-2xl liquid-glass-pill text-xs font-bold text-accent border border-accent/35 hover:-translate-y-0.5 transition-all duration-300"
              >
                ⚡ Quick Fill Demo Credentials
              </button>
            </div>

            <div className="text-center pt-2 border-t border-white/10">
              <p className="text-xs text-muted">
                New to Caliber AI?{" "}
                <button
                  type="button"
                  onClick={() => setAuthStep("REGISTER")}
                  className="font-bold text-accent hover:underline"
                >
                  Create Account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ─── MODE 2: REGISTER ─── */}
        {authStep === "REGISTER" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-black text-text tracking-tight">Create Assessor Account</h2>
              <p className="text-xs text-muted/80 mt-1">Setup technical hiring &amp; candidate evaluation portal</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-2.5 rounded-2xl liquid-glass text-sm text-text placeholder:text-muted/40 focus:outline-none focus:border-accent/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 rounded-2xl liquid-glass text-sm text-text placeholder:text-muted/40 focus:outline-none focus:border-accent/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Assessor Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl liquid-glass text-sm text-text focus:outline-none focus:border-accent/40 bg-[#151516] text-[#F7F8F8]"
                >
                  <option value="Lead Hiring Manager" className="bg-[#151516] text-[#F7F8F8] py-2">Lead Hiring Manager</option>
                  <option value="Senior AI Architect" className="bg-[#151516] text-[#F7F8F8] py-2">Senior AI Architect</option>
                  <option value="VP of Engineering" className="bg-[#151516] text-[#F7F8F8] py-2">VP of Engineering</option>
                  <option value="Tech Lead Assessor" className="bg-[#151516] text-[#F7F8F8] py-2">Tech Lead Assessor</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl liquid-glass text-sm text-text placeholder:text-muted/40 focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-accent text-white font-bold text-xs shadow-xl shadow-accent/25 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-300"
              >
                Continue to OTP Verification →
              </button>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="w-full py-2.5 rounded-2xl liquid-glass-pill text-xs font-bold text-accent border border-accent/35 hover:-translate-y-0.5 transition-all duration-300"
              >
                ⚡ Quick Fill Demo Credentials
              </button>
            </div>

            <div className="text-center pt-2 border-t border-white/10">
              <p className="text-xs text-muted">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthStep("LOGIN")}
                  className="font-bold text-accent hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ─── MODE 3: 6-DIGIT OTP VERIFICATION ─── */}
        {authStep === "OTP" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-3 shadow-lg shadow-accent/10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-text tracking-tight">Security Verification</h2>
              <p className="text-xs text-muted/80 mt-1">
                Enter the 6-digit verification code sent to <br />
                <strong className="text-text font-semibold">{pendingUser?.email || "alex.morgan@caliber.ai"}</strong>
              </p>
            </div>

            {/* 6-Digit Glass Input Array */}
            <div className="flex items-center justify-center gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className={`w-12 h-14 rounded-2xl liquid-glass text-center font-mono font-bold text-xl text-text
                              focus:outline-none transition-all duration-300 ${
                                digit
                                  ? "border-accent shadow-[0_0_12px_rgba(255,64,0,0.3)] bg-accent/10"
                                  : "focus:border-accent/40"
                              }`}
                />
              ))}
            </div>

            {otpError && (
              <p className="text-center text-xs text-error font-medium animate-fade-in">
                {otpError}
              </p>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  const code = otpDigits.join("");
                  if (code.length < 6 || otpDigits.some((d) => !d)) {
                    setOtpError("Please enter a complete 6-digit verification code.");
                    return;
                  }
                  submitOTP(code);
                }}
                disabled={isVerifying}
                className="w-full py-3.5 rounded-2xl bg-accent text-white font-bold text-xs shadow-xl shadow-accent/25 hover:bg-accent-hover hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? "Verifying Code..." : "Verify & Sign In →"}
              </button>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="w-full py-2.5 rounded-2xl liquid-glass-pill text-xs font-bold text-accent border border-accent/35 hover:-translate-y-0.5 transition-all duration-300"
              >
                ⚡ Auto-fill Code (123456)
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAuthStep("LOGIN")}
                className="hover:text-text"
              >
                ← Back to Login
              </button>

              {countdown > 0 ? (
                <span className="font-mono text-muted/60">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCountdown(30)}
                  className="text-accent hover:underline font-semibold"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
