"use client";

import { FormEvent, useState } from "react";

export default function DriverLogin() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="min-h-screen bg-[#f8f3eb] px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl border border-[#e5d7c8] bg-white p-6 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#826644]">
            ROYAL TRAVELS
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#1a1a1a]">Driver Login</h1>
          <p className="mt-2 text-sm text-[#66615b]">
            Access trip assignments and live updates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-[#1a1a1a]">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border border-[#d9c7a8] bg-[#fffdfb] px-4 py-3 text-base text-[#1a1a1a] outline-none transition focus:border-[#b89042] focus:ring-2 focus:ring-[#e9d6a5]"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#1a1a1a]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-[#d9c7a8] bg-[#fffdfb] px-4 py-3 text-base text-[#1a1a1a] outline-none transition focus:border-[#b89042] focus:ring-2 focus:ring-[#e9d6a5]"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[#4d4742]">
              <input type="checkbox" className="h-4 w-4 accent-[#b89042]" />
              Remember me
            </label>
            <button type="button" className="font-medium text-[#826644] hover:text-[#5f4d2d]">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#d5a948] px-4 py-3 text-base font-semibold text-[#1a1a1a] transition hover:bg-[#c8972f]"
          >
            Login to dashboard
          </button>
        </form>

        <div className="mt-6 border-t border-[#efe5d6] pt-4 text-center text-sm text-[#66615b]">
          Need help? Contact dispatch support
        </div>
      </div>
    </div>
  );
}
