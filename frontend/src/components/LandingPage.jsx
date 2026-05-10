import { useState } from 'react'

export default function LandingPage({ onGetStarted, isLoggedIn }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [formStatus, setFormStatus] = useState(null) // null | 'sending' | 'success' | 'error'

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    setFormStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setFormStatus('success')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      setFormStatus('error')
    }
  }

  return (
    <div className="flex flex-col">
      {/* Hero — 82vh so the next section peeks naturally */}
      <section className="flex flex-col items-center justify-center bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 py-20" style={{ minHeight: '82vh' }}>
        <div className="text-center px-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm border border-white/20">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Powered by Llama 4 Scout Vision AI
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
            AI-Powered<br />Skin Analysis
          </h1>
          <p className="text-lg text-teal-100 mb-8 leading-relaxed max-w-xl mx-auto">
            Get your Fitzpatrick skin type, acne severity, ingredient recommendations,
            and conflict warnings — in seconds.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-white text-teal-700 font-semibold text-lg px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all"
          >
            {isLoggedIn ? 'Go to Analyze →' : 'Get Started →'}
          </button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-4">How It Works</h2>
          <p className="text-slate-500 text-center mb-16">Three steps from photo to personalized skincare plan.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: '📸',
                step: 'Step 1',
                title: 'Capture',
                desc: 'Take a photo with your webcam or upload one from your device. The oval guide helps you frame your face correctly.',
              },
              {
                icon: '🤖',
                step: 'Step 2',
                title: 'Analyze',
                desc: 'Llama 4 Scout reads your skin type, acne level, and Fitzpatrick tone — the 6-point scale used by dermatologists.',
              },
              {
                icon: '✨',
                step: 'Step 3',
                title: 'Act',
                desc: 'Get a personalized ingredient list and a conflict guide showing which combinations to avoid and why.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-5xl mb-5">{item.icon}</div>
                <div className="text-xs font-semibold text-teal-500 uppercase tracking-widest mb-2">{item.step}</div>
                <h3 className="text-xl font-semibold text-slate-800 mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-4">Features</h2>
          <p className="text-slate-500 text-center mb-16">Everything you need, nothing you don't.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: '🔬',
                title: 'AI Vision Analysis',
                desc: 'Llama 4 Scout reads your face in ~2 seconds via the Groq API, one of the fastest inference providers available. No local compute needed.',
              },
              {
                icon: '🎨',
                title: 'Fitzpatrick Scale',
                desc: 'Six-type skin tone classification (I–VI) used clinically. Includes an accuracy disclaimer for darker skin tones (IV–VI) where training data is historically underrepresented.',
              },
              {
                icon: '⚗️',
                title: 'Ingredient Conflict Detection',
                desc: '13 known bad combinations detected and explained — for example, Vitamin C + Niacinamide cancel each other out. Includes AM/PM timing advice.',
              },
              {
                icon: '📋',
                title: 'Analysis History',
                desc: 'Every analysis is saved to your account. Track how your skin changes over time and see which ingredients have been recommended most.',
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-slate-100">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-6">About the Project</h2>
          <p className="text-slate-600 leading-relaxed mb-8">
            SkinDetectorApp is a final-year CS project demonstrating real-world integration of
            multimodal AI, REST APIs, JWT authentication, and a React frontend. It integrates
            the Groq API (Llama 4 Scout) for vision-based skin analysis, FastAPI for the backend,
            SQLite with Alembic migrations for data persistence, and the Fitzpatrick scale for
            clinically-grounded skin tone classification.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['FastAPI', 'React 19', 'Groq AI', 'Llama 4 Scout', 'SQLAlchemy', 'Alembic', 'JWT', 'Tailwind CSS v4'].map((tech) => (
              <span key={tech} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg border border-teal-100">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Query Form */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">Send Us a Query</h2>
            <p className="text-slate-500">Have a question or feedback about the project? We'd love to hear from you.</p>
          </div>

          {formStatus === 'success' ? (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-10 text-center">
              <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Query received!</h3>
              <p className="text-slate-500 text-sm mb-6">We'll get back to you shortly.</p>
              <button
                onClick={() => setFormStatus(null)}
                className="text-sm text-teal-600 font-medium hover:text-teal-700 transition-colors"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-8 space-y-5">
              {formStatus === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                  Something went wrong. Please try again.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="What's this about?"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your question or feedback..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={formStatus === 'sending'}
                className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/25"
              >
                {formStatus === 'sending' ? 'Sending...' : 'Send Query'}
              </button>
            </form>
          )}

          <p className="text-center text-slate-400 text-sm mt-10">© 2026 SkinDetectorApp</p>
        </div>
      </section>
    </div>
  )
}
