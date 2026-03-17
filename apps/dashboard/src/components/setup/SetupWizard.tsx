'use client'

import { useState, useEffect } from 'react'

interface FormData {
  appName: string
  username: string
  password: string
  confirmPassword: string
  kioskKeyCombo: string
}

const TOTAL_STEPS = 5

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const step = i + 1
        const isActive = step === current
        const isComplete = step < current
        return (
          <div
            key={step}
            className={[
              'rounded-full transition-all duration-300',
              isActive
                ? 'w-6 h-2.5 bg-blue-500'
                : isComplete
                ? 'w-2.5 h-2.5 bg-blue-500/50'
                : 'w-2.5 h-2.5 bg-gray-700',
            ].join(' ')}
            aria-label={`Step ${step}`}
          />
        )
      })}
    </div>
  )
}

function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  helper,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  helper?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
      {helper && <p className="mt-1.5 text-xs text-gray-500">{helper}</p>}
    </div>
  )
}

export default function SetupWizard() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    appName: '',
    username: '',
    password: '',
    confirmPassword: '',
    kioskKeyCombo: 'ctrl+shift+alt+d',
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Step 5 redirect after 1.5s
  useEffect(() => {
    if (step === 5) {
      const timer = setTimeout(() => {
        window.location.href = '/'
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [step])

  function update(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setValidationError(null)
  }

  function handleNext() {
    setValidationError(null)

    if (step === 1) {
      if (!formData.appName.trim()) {
        setValidationError('Application name is required.')
        return
      }
    }

    if (step === 2) {
      if (!formData.username.trim()) {
        setValidationError('Username is required.')
        return
      }
      if (formData.password.length < 8) {
        setValidationError('Password must be at least 8 characters.')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setValidationError('Passwords do not match.')
        return
      }
    }

    if (step === 3) {
      if (!formData.kioskKeyCombo.trim()) {
        setValidationError('Key combination is required.')
        return
      }
    }

    setStep((s) => s + 1)
  }

  async function handleFinish() {
    setSubmitError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: formData.appName,
          username: formData.username,
          password: formData.password,
          kioskKeyCombo: formData.kioskKeyCombo,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(data?.error ?? 'Setup failed. Please try again.')
        setLoading(false)
        return
      }

      setStep(5)
    } catch {
      setSubmitError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span className="text-xl font-bold text-gray-100 font-mono tracking-tight">
          DisplayGrid
        </span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        {step < 5 && <StepDots current={step} />}

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-100 mb-1">Welcome</h2>
              <p className="text-sm text-gray-400">
                Let&apos;s get DisplayGrid set up. Start by naming your application.
              </p>
            </div>
            <InputField
              id="appName"
              label="Application Name"
              value={formData.appName}
              onChange={(v) => update('appName', v)}
              placeholder="DisplayGrid"
            />
            {validationError && (
              <p className="text-sm text-red-400">{validationError}</p>
            )}
            <button
              onClick={handleNext}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Admin Account */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-100 mb-1">Admin Account</h2>
              <p className="text-sm text-gray-400">
                Create the administrator account for this installation.
              </p>
            </div>
            <div className="space-y-4">
              <InputField
                id="username"
                label="Username"
                value={formData.username}
                onChange={(v) => update('username', v)}
                placeholder="admin"
              />
              <InputField
                id="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={(v) => update('password', v)}
                placeholder="••••••••"
                helper="Must be at least 8 characters"
              />
              <InputField
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(v) => update('confirmPassword', v)}
                placeholder="••••••••"
              />
            </div>
            {validationError && (
              <p className="text-sm text-red-400">{validationError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition focus:outline-none"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Kiosk Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-100 mb-1">Kiosk Settings</h2>
              <p className="text-sm text-gray-400">
                Configure how operators can exit kiosk mode on managed screens.
              </p>
            </div>
            <InputField
              id="kioskKeyCombo"
              label="Exit key combination"
              value={formData.kioskKeyCombo}
              onChange={(v) => update('kioskKeyCombo', v)}
              placeholder="ctrl+shift+alt+d"
              helper="This key combination will show the PIN overlay on kiosk screens, allowing authorised staff to exit kiosk mode."
            />
            {validationError && (
              <p className="text-sm text-red-400">{validationError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition focus:outline-none"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-100 mb-1">Review</h2>
              <p className="text-sm text-gray-400">
                Confirm your settings before finishing setup.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-400">Application name</span>
                <span className="text-sm text-gray-100 font-medium">
                  {formData.appName}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-400">Admin username</span>
                <span className="text-sm text-gray-100 font-medium">
                  {formData.username}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-400">Exit key combo</span>
                <span className="text-sm text-gray-100 font-mono font-medium">
                  {formData.kioskKeyCombo}
                </span>
              </div>
            </div>
            {submitError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-400">{submitError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-medium rounded-lg transition focus:outline-none"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Finishing…
                  </span>
                ) : (
                  'Looks good — finish setup'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 5 && (
          <div className="text-center py-4 space-y-4">
            <div className="flex items-center justify-center mx-auto w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100 mb-1">Setup complete!</h2>
              <p className="text-sm text-gray-400">
                Taking you to the dashboard&hellip;
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <svg
                className="animate-spin"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Redirecting
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
