import React, { useState, useEffect } from 'react';
import Login from './Login';
import API_BASE_URL from '../config';

export default function Home({ onNavigate, onLoginSuccess }) {
  const [logo, setLogo] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lifted login state so demo credential buttons can pre-fill the form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedCred, setSelectedCred] = useState(null);

  const applyCredential = (email, pass) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setSelectedCred(email);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch logo
        const logoResponse = await fetch(`${API_BASE_URL}/public/logo`);
        if (logoResponse.ok) {
          const data = await logoResponse.json();
          if (data.logo) {
            setLogo(data.logo);
          }
        }

        // Fetch hero slides
        const slidesResponse = await fetch(`${API_BASE_URL}/public/hero-slides`);
        if (slidesResponse.ok) {
          const data = await slidesResponse.json();
          setHeroSlides(data.sort((a, b) => a.order - b.order));
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (heroSlides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const navLinks = [
    { label: 'Home', page: 'home' },
    { label: 'About Us', page: 'about' },
    { label: 'Contact Us', page: 'contact' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ── Navbar ── */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">POS</span>
                </div>
              )}
              <span className="text-white font-bold text-xl">POS System</span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden sm:flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link.page}
                  onClick={() => onNavigate(link.page)}
                  className="text-slate-300 hover:text-indigo-400 transition-colors font-medium text-sm"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                /* X icon */
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <div
          className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => { onNavigate(link.page); setMobileMenuOpen(false); }}
                className="w-full text-left text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors font-medium text-sm px-3 py-2.5 rounded-lg"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-16">

        {/* Hero Section with Carousel */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : heroSlides.length > 0 ? (
          <div className="grid lg:grid-cols-2 gap-8 items-center mb-16">
            {/* Carousel Column */}
            <div className="relative">
              <div className="relative h-96 rounded-2xl overflow-hidden">
                {heroSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {slide.image_url ? (
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-4xl">{slide.title}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Navigation Arrows */}
                {heroSlides.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Dots Indicator */}
                {heroSlides.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {heroSlides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Text and Button Column */}
            <div className="space-y-6">
              {heroSlides[currentSlide] && (
                <>
                  <div>
                    {heroSlides[currentSlide].subtitle && (
                      <p className="text-indigo-400 font-semibold text-lg mb-2">
                        {heroSlides[currentSlide].subtitle}
                      </p>
                    )}
                    <h1 className="text-5xl font-bold text-white mb-4">
                      {heroSlides[currentSlide].title}
                    </h1>
                    {heroSlides[currentSlide].description && (
                      <p className="text-xl text-slate-300 leading-relaxed">
                        {heroSlides[currentSlide].description}
                      </p>
                    )}
                  </div>

                  {heroSlides[currentSlide].button_text && (
                    <button
                      onClick={() => {
                        if (heroSlides[currentSlide].button_link) {
                          if (heroSlides[currentSlide].button_link.startsWith('/')) {
                            const page = heroSlides[currentSlide].button_link.slice(1);
                            onNavigate(page);
                          } else {
                            window.open(heroSlides[currentSlide].button_link, '_blank');
                          }
                        }
                      }}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/30"
                    >
                      {heroSlides[currentSlide].button_text}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* Fallback Hero Section */
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-5xl font-bold text-white mb-6">
              Welcome to Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">POS System</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              A powerful and intuitive point of sale solution for modern businesses. Manage inventory, track sales, and grow your business with ease.
            </p>
          </div>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all">
            <h3 className="text-white font-semibold text-lg mb-2">Inventory Management</h3>
            <p className="text-slate-400 text-sm">Track stock levels, manage products, and get alerts for low inventory.</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition-all">
            <h3 className="text-white font-semibold text-lg mb-2">Sales Analytics</h3>
            <p className="text-slate-400 text-sm">Comprehensive reports and insights to make data-driven decisions.</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-pink-500/50 transition-all">
            <h3 className="text-white font-semibold text-lg mb-2">Easy Checkout</h3>
            <p className="text-slate-400 text-sm">Fast and efficient checkout process with multiple payment options.</p>
          </div>
        </div>

        {/* ── Login Section – Horizontal Layout ── */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
          {/* Section Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-700/40">
            <h2 className="text-2xl font-bold text-white mb-1">Login to Your Account</h2>
            <p className="text-slate-400 text-sm">Access your dashboard and manage your business</p>
          </div>

          {/* Two-column body */}
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/40">

            {/* Left – Login Form */}
            <div className="px-8 py-8">
              <Login
                onLoginSuccess={onLoginSuccess}
                hideCredentials
                externalEmail={loginEmail}
                setExternalEmail={setLoginEmail}
                externalPassword={loginPassword}
                setExternalPassword={setLoginPassword}
              />
            </div>

            {/* Right – Demo Credentials */}
            <div className="px-8 py-8">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Demo Credentials</p>
              <p className="text-xs text-slate-600 mb-4">Click any credential to auto-fill the form</p>
              <div className="flex flex-col gap-2">
                {/* Super Admin */}
                <button
                  type="button"
                  onClick={() => applyCredential('restricted', '******')}
                  className={`flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 border transition-all group ${
                    selectedCred === 'restricted'
                      ? 'bg-rose-500/25 border-rose-400/60 ring-1 ring-rose-400/40'
                      : 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-400/40'
                  }`}
                >
                  <span className="text-xs font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full shrink-0">SUPER ADMIN</span>
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors truncate">Restricted!!!</span>
                  {selectedCred === 'restricted' && (
                    <span className="ml-auto text-rose-400 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </span>
                  )}
                </button>

                {/* Shop Admins & Staff */}
                {[
                  { email: 'alice@boutique.com', pass: 'alice123', role: 'SHOP ADMIN', color: 'indigo' },
                  { email: 'admin@mkfashion.com', pass: 'mkfashion123', role: 'SHOP ADMIN', color: 'indigo' },
                  { email: 'admin@mkpharmacy.com', pass: 'mkpharmacy123', role: 'SHOP ADMIN', color: 'indigo' },
                  { email: 'staff1@mkpharmacy.com', pass: 'staff123', role: 'SHOP STAFF', color: 'slate' },
                  { email: 'staff1@mkfashion.com', pass: 'staff123', role: 'SHOP STAFF', color: 'slate' },
                ].map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => applyCredential(cred.email, cred.pass)}
                    className={`flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 border transition-all group ${
                      selectedCred === cred.email
                        ? 'bg-indigo-500/20 border-indigo-400/60 ring-1 ring-indigo-400/40'
                        : 'bg-gray-500/10 border-gray-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/30'
                    }`}
                  >
                    <span className="text-xs font-bold bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full shrink-0">{cred.role}</span>
                    <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors truncate">{cred.email} · {cred.pass}</span>
                    {selectedCred === cred.email && (
                      <span className="ml-auto text-indigo-400 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-center text-slate-600 text-xs mt-6">
                Multi-Tenant Point of Sale System &copy; {new Date().getFullYear()}{' '}
                developed by{' '}
                <a
                  href="https://its-mk.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:text-indigo-400 transition-colors"
                >
                  MK
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/80 backdrop-blur-md border-t border-slate-700/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-400 text-sm">
            <p>&copy; 2024 POS System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
