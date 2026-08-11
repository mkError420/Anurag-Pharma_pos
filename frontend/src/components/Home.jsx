import React, { useState, useEffect } from 'react';
import Login from './Login';
import Footer from './Footer';
import API_BASE_URL from '../config';
import AnimatedButton from './AnimatedButton';

export default function Home({ onNavigate, onLoginSuccess, publicPage }) {
  const [logo, setLogo] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [visibleCardIndex, setVisibleCardIndex] = useState(0);
  const [showYoutubePopup, setShowYoutubePopup] = useState(false);
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState('');
  const [animatedStats, setAnimatedStats] = useState({
    clients: 0,
    transactions: 0,
    districts: 0,
    uptime: 0
  });

  // Lifted login state so demo credential buttons can pre-fill the form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedCred, setSelectedCred] = useState(null);

  const applyCredential = (email, pass) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setSelectedCred(email);
  };

  const getYoutubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleButtonClick = (link) => {
    if (!link) return;

    // Check if it's a YouTube link
    const youtubeVideoId = getYoutubeVideoId(link);
    if (youtubeVideoId) {
      setYoutubeVideoUrl(`https://www.youtube.com/embed/${youtubeVideoId}`);
      setShowYoutubePopup(true);
      return;
    }

    // Handle internal navigation
    if (link.startsWith('/')) {
      const page = link.slice(1);
      onNavigate(page);
    } else {
      // Open external links in new tab
      window.open(link, '_blank');
    }
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
          setHeroSlides(data.sort((a, b) => a.display_order - b.display_order));
        }

        // Fetch pricing plans
        const pricingResponse = await fetch(`${API_BASE_URL}/public/pricing-plans`);
        if (pricingResponse.ok) {
          const data = await pricingResponse.json();
          setPricingPlans(data);
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

  // Animate stats on page load
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const animate = () => {
      step++;
      const progress = step / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats({
        clients: Math.floor(500 * easeProgress),
        transactions: Math.floor(50 * easeProgress),
        districts: Math.floor(15 * easeProgress),
        uptime: (99.9 * easeProgress).toFixed(1)
      });

      if (step < steps) {
        setTimeout(animate, interval);
      } else {
        setAnimatedStats({
          clients: 500,
          transactions: 50,
          districts: 15,
          uptime: 99.9
        });
      }
    };

    animate();
  }, []);

  // Sequential fade-in-up animation for feature cards
  useEffect(() => {
    const animatedElements = document.querySelectorAll('.feature-card-sequential');

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px',
      threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const cardIndex = parseInt(entry.target.dataset.index);
        
        if (entry.isIntersecting) {
          // When a card comes into view, show all cards up to this index
          setVisibleCardIndex(cardIndex);
        } else {
          // When scrolling up, check which card is now most visible
          const allCards = document.querySelectorAll('.feature-card-sequential');
          let maxVisibleIndex = 0;
          
          allCards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const index = parseInt(card.dataset.index);
            // Check if card is in the middle of viewport
            if (rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3) {
              maxVisibleIndex = Math.max(maxVisibleIndex, index);
            }
          });
          
          setVisibleCardIndex(maxVisibleIndex);
        }
      });
    }, observerOptions);

    animatedElements.forEach((el) => observer.observe(el));

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el));
    };
  }, []);


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
    <div className="min-h-screen bg-white">
      <style>{`
        .site-logo-shimmer {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(
            110deg,
            #0f172a 30%,
            #38bdf8 50%,
            #0f172a 70%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s infinite linear;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .feature-card-sequential {
          opacity: 0;
          transform: translateY(50px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .feature-card-sequential.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      {/* ── Navbar ── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="Logo" className="h-12 w-12 rounded-lg object-contain bg-slate-900" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">POS</span>
                </div>
              )}
              <p className="site-logo-shimmer">Codexxaa-Solutions</p>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden sm:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.page}
                  onClick={() => onNavigate(link.page)}
                  className={`text-gray-600 hover:text-gray-900 transition-colors font-medium text-base relative ${
                    publicPage === link.page ? 'text-gray-900' : ''
                  }`}
                >
                  {link.label}
                  {publicPage === link.page && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>
                  )}
                </button>
              ))}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
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
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => { onNavigate(link.page); setMobileMenuOpen(false); }}
                className={`w-full text-left text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors font-medium text-sm px-3 py-2.5 rounded-lg relative ${
                  publicPage === link.page ? 'text-gray-900 bg-gray-50' : ''
                }`}
              >
                {link.label}
                {publicPage === link.page && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 mb-20">

        {/* Hero Section with Carousel */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
          </div>
        ) : heroSlides.length > 0 ? (
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            {/* Carousel Column */}
            <div className="relative">
              <div className="relative h-[450px] rounded-2xl overflow-hidden shadow-2xl">
                {heroSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-700 ${
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
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
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
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center text-gray-800 transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center text-gray-800 transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Dots Indicator */}
                {heroSlides.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                    {heroSlides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === currentSlide ? 'bg-gray-900 w-8' : 'bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Text and Button Column */}
            <div className="space-y-8">
              {heroSlides[currentSlide] && (
                <>
                  <div>
                    {heroSlides[currentSlide].subtitle && (
                      <p className="text-gray-600 font-semibold text-lg mb-3 uppercase tracking-wide">
                        {heroSlides[currentSlide].subtitle}
                      </p>
                    )}
                    <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
                      {heroSlides[currentSlide].title}
                    </h1>
                    {heroSlides[currentSlide].description && (
                      <p className="text-xl text-gray-600 leading-relaxed">
                        {heroSlides[currentSlide].description}
                      </p>
                    )}
                  </div>

                  {heroSlides[currentSlide].button_text && (
                    <AnimatedButton
                      onClick={() => handleButtonClick(heroSlides[currentSlide].button_link)}
                    >
                      {heroSlides[currentSlide].button_text}
                    </AnimatedButton>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* Fallback Hero Section */
          <div className="text-center mb-20 space-y-6">
            <h1 className="text-6xl font-bold text-gray-900 mb-8">
              Welcome to Our <span className="text-gray-700">POS System</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              A powerful and intuitive point of sale solution for modern businesses. Manage inventory, track sales, and grow your business with ease.
            </p>
          </div>
        )}

        {/* Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <div className="text-center p-4 bg-gradient-to-br from-rose-50 to-pink-100 rounded-xl border border-rose-200">
            <div className="text-3xl font-bold text-rose-700 mb-1">{animatedStats.clients}+</div>
            <div className="text-rose-600 font-medium text-sm">Happy Clients</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl border border-blue-200">
            <div className="text-3xl font-bold text-blue-700 mb-1">{animatedStats.transactions}K+</div>
            <div className="text-blue-600 font-medium text-sm">Transactions Daily</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl border border-amber-200">
            <div className="text-3xl font-bold text-amber-700 mb-1">{animatedStats.districts}+</div>
            <div className="text-amber-600 font-medium text-sm">Districts Served</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl border border-emerald-200">
            <div className="text-3xl font-bold text-emerald-700 mb-1">{animatedStats.uptime}%</div>
            <div className="text-emerald-600 font-medium text-sm">Uptime Guaranteed</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-24">
          <AnimatedButton onClick={() => setShowLoginPopup(true)}>
            View Demo
          </AnimatedButton>
          <AnimatedButton onClick={() => onNavigate('contact')}>
            Contact Us
          </AnimatedButton>
        </div>

        {/* Login Popup */}
        {showLoginPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[60vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Login to View Demo</h2>
                  <button
                    onClick={() => setShowLoginPopup(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <Login
                  onLoginSuccess={onLoginSuccess}
                  prefilledEmail={loginEmail}
                  prefilledPassword={loginPassword}
                  twoColumnLayout={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* YouTube Video Popup */}
        {showYoutubePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Video</h2>
                <button
                  onClick={() => setShowYoutubePopup(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="aspect-video">
                <iframe
                  src={youtubeVideoUrl}
                  className="w-full h-full"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Our POS System?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the perfect blend of functionality and simplicity
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-900 transition-all shadow-sm hover:shadow-lg">
              <h3 className="text-gray-900 font-semibold text-xl mb-3">Inventory Management</h3>
              <p className="text-gray-600 leading-relaxed">Track stock levels, manage products, and get alerts for low inventory with real-time updates.</p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-900 transition-all shadow-sm hover:shadow-lg">
              <h3 className="text-gray-900 font-semibold text-xl mb-3">Sales Analytics</h3>
              <p className="text-gray-600 leading-relaxed">Comprehensive reports and insights to make data-driven decisions and grow your business.</p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-900 transition-all shadow-sm hover:shadow-lg">
              <h3 className="text-gray-900 font-semibold text-xl mb-3">Easy Checkout</h3>
              <p className="text-gray-600 leading-relaxed">Fast and efficient checkout process with multiple payment options and seamless integration.</p>
            </div>
          </div>
        </div>

        {/* Comprehensive Features Section */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Complete Feature List</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage your business efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sales & Billing */}
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-2xl border border-rose-100 hover:shadow-xl transition-all duration-300 ${0 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="0"
            >
              
              <h3 className="text-xl font-bold text-gray-900 mb-4">Sales & Billing</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Multi-tab checkout system</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Product search & barcode scanning</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Customer attachment to sales</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Discount support (percentage & amount)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Tax calculation with configurable rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Multiple payment methods</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Receipt generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Real-time stock validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Loyalty points redemption</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Hold/defer bill functionality</span>
                </li>
              </ul>
            </div>

            {/* Inventory Management */}
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100 hover:shadow-xl transition-all duration-300 ${1 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="1"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Inventory Management</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Full CRUD operations for products</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">SKU-based product identification</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Low stock alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Expiry date tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Batch/Lot tracking with FIFO</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Stock adjustments tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Wastage/Loss reporting</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Purchase order management</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Bulk CSV import/export</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Cost price history tracking</span>
                </li>
              </ul>
            </div>

            {/* Customer Management */}
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-2xl border border-amber-100 hover:shadow-xl transition-all duration-300 ${2 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="2"
            >

              <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Management</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Full customer directory</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Credit/due balance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Due payment collection</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Loyalty points system</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Configurable point rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Returns & refunds processing</span>
                </li>
              </ul>
            </div>

            {/* Supplier Management */}
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-100 hover:shadow-xl transition-all duration-300 ${3 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="3"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Supplier Management</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Full supplier directory</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Credit & due balance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Purchase order tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Supplier returns processing</span>
                </li>
              </ul>
            </div>

            {/* Staff & HR Management */}
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border border-purple-100 hover:shadow-xl transition-all duration-300 ${4 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="4"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Staff & HR Management</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Multi-role user system</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Daily attendance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Salary & payroll management</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Overtime calculation</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Attendance status tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Section access restrictions</span>
                </li>
              </ul>
            </div>

            {/* Financial Management */}
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-2xl border border-teal-100 hover:shadow-xl transition-all duration-300 ${5 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="5"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Financial Management</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Revenue & profit tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">COGS calculation</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">7-day sales trend analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Expense tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Investment tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-teal-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Due payments tracking</span>
                </li>
              </ul>
            </div>

            {/* Multi-Shop Support */}
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 hover:shadow-xl transition-all duration-300 ${6 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Multi-Shop / Multi-Tenant</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Multiple tenant shops</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Shop-specific tax rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Data isolation & security</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Shop suspension/activation</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Logo & branding customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Global user management</span>
                </li>
              </ul>
            </div>

            {/* Reporting & Analytics */}
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-100 hover:shadow-xl transition-all duration-300 ${7 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="7"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Reporting & Analytics</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Real-time dashboard metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Sales history & filtering</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Unified transaction view</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Inventory reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Payment method analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Top-selling products</span>
                </li>
              </ul>
            </div>

            {/* System Security */} 
            <div 
              className={`feature-card-sequential bg-gradient-to-br from-slate-50 to-gray-50 p-6 rounded-2xl border border-slate-100 hover:shadow-xl transition-all duration-300 ${8 <= visibleCardIndex ? 'is-visible' : ''}`}
              data-index="8"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">System Security</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">JWT-based authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Role-based access control</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Shop-level data isolation</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Token validation & auto-logout</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your business needs
            </p>
          </div>
          <div className="pricing-card-container grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <div key={plan.id} className="pricing-card">
                <div className="face face1">
                  <div className="content">
                    <h3>{plan.name}</h3>
                    <div className="text-white text-2xl font-bold mt-2">
                      {plan.currency} {plan.price}
                      <span className="text-sm font-normal">/{plan.billing_period}</span>
                    </div>
                  </div>
                </div>
                <div className="face face2">
                  <div className="content">
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <ul className="space-y-2 mb-6 text-left">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-gray-600 text-sm">
                          <svg 
                            className="w-4 h-4 mr-2 text-gray-900" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <AnimatedButton 
                      style={{ width: '100%' }}
                    >
                      {plan.button_text}
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Clients Say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Trusted by businesses worldwide
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "This POS system has transformed how we manage our retail store. The inventory tracking alone has saved us countless hours and reduced shrinkage significantly."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                  <span className="text-gray-600 font-semibold">JD</span>
                </div>
                <div>
                  <div className="text-gray-900 font-semibold">John Davidson</div>
                  <div className="text-gray-600 text-sm">Retail Store Owner</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "The analytics features are incredible. I can now make data-driven decisions about our product offerings and pricing strategies. Highly recommend for any growing business."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                  <span className="text-gray-600 font-semibold">SM</span>
                </div>
                <div>
                  <div className="text-gray-900 font-semibold">Sarah Mitchell</div>
                  <div className="text-gray-600 text-sm">Boutique Manager</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "Customer support is exceptional. Whenever we have questions, they respond quickly and help us resolve issues. The system is reliable and easy to use for our staff."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                  <span className="text-gray-600 font-semibold">MR</span>
                </div>
                <div>
                  <div className="text-gray-900 font-semibold">Michael Roberts</div>
                  <div className="text-gray-600 text-sm">Restaurant Owner</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Partners/Clients Section - News Ticker */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Trusted by Leading Brands</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join hundreds of satisfied businesses
            </p>
          </div>
          <div className="overflow-hidden py-8 bg-white rounded-lg border border-white">
            <div className="flex animate-ticker">
              {[...Array(4)].map((_, repeatIndex) => (
                ['Boutique', 'Fashion', 'Pharmacy', 'Retail', 'Grocery', 'Electronics'].map((brand, brandIndex) => {
                  const bgColors = [
                    'bg-blue-100',
                    'bg-purple-100', 
                    'bg-pink-100',
                    'bg-green-100',
                    'bg-yellow-100',
                    'bg-orange-100'
                  ];
                  return (
                    <div 
                      key={`${repeatIndex}-${brandIndex}`} 
                      className="flex-shrink-0 px-12 py-6 flex items-center justify-center"
                    >
                      <div className={`${bgColors[brandIndex]} p-4 rounded-lg border border-gray-200 shadow-sm`}>
                        <div className="text-gray-600 font-semibold text-xl">{brand}</div>
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
          </div>
        </div>

        {/* ── Login Section – Horizontal Layout ── */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
          {/* Section Header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Login to Your Account</h2>
            <p className="text-gray-600 text-sm">Access your dashboard and manage your business</p>
          </div>

          {/* Two-column body */}
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">

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
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Demo Credentials</p>
              <p className="text-xs text-gray-400 mb-4">Click any credential to auto-fill the form</p>
              <div className="flex flex-col gap-2">
                {/* Super Admin */}
                <button
                  type="button"
                  onClick={() => applyCredential('restricted', '******')}
                  className={`flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 border transition-all group ${
                    selectedCred === 'restricted'
                      ? 'bg-red-50 border-red-300 ring-1 ring-red-200'
                      : 'bg-red-50/50 border-red-200 hover:bg-red-50 hover:border-red-300'
                  }`}
                >
                  <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full shrink-0">SUPER ADMIN</span>
                  <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors truncate">Restricted!!!</span>
                  {selectedCred === 'restricted' && (
                    <span className="ml-auto text-red-600 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </span>
                  )}
                </button>

                {/* Shop Admins & Staff */}
                {[
                  { email: 'alice@boutique.com', pass: 'alice123', role: 'SHOP ADMIN', color: 'gray' },
                  { email: 'admin@mkfashion.com', pass: 'mkfashion123', role: 'SHOP ADMIN', color: 'gray' },
                  { email: 'admin@mkpharmacy.com', pass: 'mkpharmacy123', role: 'SHOP ADMIN', color: 'gray' },
                  { email: 'staff1@mkpharmacy.com', pass: 'staff123', role: 'SHOP STAFF', color: 'gray' },
                  { email: 'staff1@mkfashion.com', pass: 'staff123', role: 'SHOP STAFF', color: 'gray' },
                ].map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => applyCredential(cred.email, cred.pass)}
                    className={`flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 border transition-all group ${
                      selectedCred === cred.email
                        ? 'bg-gray-100 border-gray-300 ring-1 ring-gray-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full shrink-0">{cred.role}</span>
                    <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors truncate">{cred.email} · {cred.pass}</span>
                    {selectedCred === cred.email && (
                      <span className="ml-auto text-gray-700 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-center text-gray-500 text-xs mt-6">
                Multi-Tenant Point of Sale System &copy; {new Date().getFullYear()}{' '}
                developed by{' '}
                <a
                  href="https://its-mk.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
                >
                  MK
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/8801572491828"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center justify-center"
        title="Contact us on WhatsApp"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}