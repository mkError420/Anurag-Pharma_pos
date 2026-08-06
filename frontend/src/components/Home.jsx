import React, { useState, useEffect } from 'react';
import Login from './Login';
import API_BASE_URL from '../config';

export default function Home({ onNavigate, onLoginSuccess }) {
  const [logo, setLogo] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navbar */}
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

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => onNavigate('home')}
                className="text-white hover:text-indigo-400 transition-colors font-medium"
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('about')}
                className="text-slate-300 hover:text-indigo-400 transition-colors font-medium"
              >
                About Us
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="text-slate-300 hover:text-indigo-400 transition-colors font-medium"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Carousel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-16">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : heroSlides.length > 0 ? (
          <div className="grid lg:grid-cols-2 gap-8 items-center">
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

        {/* Login Section */}
        <div className="max-w-md mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Login to Your Account</h2>
              <p className="text-slate-400 text-sm">Access your dashboard and manage your business</p>
            </div>
            <Login onLoginSuccess={onLoginSuccess} />
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
