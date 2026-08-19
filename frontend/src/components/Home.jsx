import React, { useState, useEffect } from 'react';
import Login from './Login';
import Footer from './Footer';
import API_BASE_URL from '../config';
import AnimatedButton from './AnimatedButton';
import ElectronicCashDrawerModal from './ElectronicCashDrawerModal';

export default function Home({ onNavigate, onLoginSuccess, publicPage }) {
  const [logo, setLogo] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [videos, setVideos] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showDrawerModal, setShowDrawerModal] = useState(false);
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

  // Subscription modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPlanForSub, setSelectedPlanForSub] = useState(null);
  const [subForm, setSubForm] = useState({
    subscriber_name: '',
    shop_name: '',
    email: '',
    phone: '',
    payment_method: 'bKash',
    transaction_id: '',
    notes: ''
  });
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState('');
  const [subErrorMsg, setSubErrorMsg] = useState('');
  const [paymentNumbers, setPaymentNumbers] = useState([]);
  const [receiptData, setReceiptData] = useState(null);
  const [copiedNumber, setCopiedNumber] = useState(null);

  const handleCopyNumber = (num) => {
    if (!num) return;
    navigator.clipboard?.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  const handleOpenSubscriptionModal = (plan) => {
    setSelectedPlanForSub(plan);
    setReceiptData(null);
    setSubForm({
      subscriber_name: '',
      shop_name: '',
      email: '',
      phone: '',
      payment_method: 'bKash',
      transaction_id: '',
      notes: ''
    });
    setSubErrorMsg('');
    setSubSuccessMsg('');
    setShowSubscriptionModal(true);
  };

  const handleSubscribeSubmit = async (e) => {
    e.preventDefault();
    setSubSubmitting(true);
    setSubErrorMsg('');
    setSubSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/public/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlanForSub?.id,
          plan_name: selectedPlanForSub?.name,
          price: selectedPlanForSub?.price,
          currency: selectedPlanForSub?.currency || 'BDT',
          billing_period: selectedPlanForSub?.billing_period || 'month',
          ...subForm
        })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        data = {};
      }

      if (response.ok && data.success) {
        setSubSuccessMsg('success');
        setReceiptData({
          id: data.subscription_id || data.subscription?.id || data.id || 'N/A',
          date: new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }),
          subscriber_name: subForm.subscriber_name,
          shop_name: subForm.shop_name,
          email: subForm.email,
          phone: subForm.phone,
          plan_name: selectedPlanForSub?.name,
          price: selectedPlanForSub?.price,
          currency: selectedPlanForSub?.currency || 'BDT',
          billing_period: selectedPlanForSub?.billing_period || 'month',
          payment_method: subForm.payment_method,
          transaction_id: subForm.transaction_id,
          notes: subForm.notes,
          status: 'Pending Verification'
        });
      } else {
        setSubErrorMsg(data.error || 'Failed to submit subscription request. Please try again.');
      }
    } catch (err) {
      setSubErrorMsg(err.message || 'Network error. Failed to connect to server.');
    } finally {
      setSubSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const r = receiptData;
    printWindow.document.write(`
      <html><head><title>Subscription Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a2e; background: #fff; }
        .receipt { max-width: 520px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; padding: 28px; text-align: center; }
        .header h1 { font-size: 20px; margin-bottom: 4px; letter-spacing: 0.5px; }
        .header p { font-size: 12px; opacity: 0.7; }
        .badge { display: inline-block; background: #fbbf24; color: #1a1a2e; padding: 3px 14px; border-radius: 50px; font-size: 11px; font-weight: 700; margin-top: 10px; letter-spacing: 0.5px; }
        .body { padding: 24px 28px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 500; }
        .value { color: #0f172a; font-weight: 600; text-align: right; max-width: 60%; }
        .total-row { background: #f8fafc; margin: 12px -28px; padding: 14px 28px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
        .footer { text-align: center; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
        @media print { body { padding: 0; } .receipt { border: none; } }
      </style></head><body>
      <div class="receipt">
        <div class="header">
          <h1>Subscription Receipt</h1>
          <p>Multi-Tenant POS System</p>
          <div class="badge">${r.status}</div>
        </div>
        <div class="body">
          <div class="row"><span class="label">Receipt ID</span><span class="value">#SUB-${String(r.id).padStart(5, '0')}</span></div>
          <div class="row"><span class="label">Date</span><span class="value">${r.date}</span></div>
          <div class="row"><span class="label">Subscriber</span><span class="value">${r.subscriber_name}</span></div>
          <div class="row"><span class="label">Shop / Company</span><span class="value">${r.shop_name}</span></div>
          <div class="row"><span class="label">Email</span><span class="value">${r.email}</span></div>
          <div class="row"><span class="label">Phone</span><span class="value">${r.phone}</span></div>
          <div class="row"><span class="label">Plan</span><span class="value">${r.plan_name}</span></div>
          <div class="row"><span class="label">Billing Period</span><span class="value">${r.billing_period}</span></div>
          <div class="row"><span class="label">Payment Method</span><span class="value">${r.payment_method}</span></div>
          ${r.transaction_id ? `<div class="row"><span class="label">Transaction ID</span><span class="value">${r.transaction_id}</span></div>` : ''}
          ${r.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${r.notes}</span></div>` : ''}
          <div class="total-row"><span>Total Amount</span><span>${r.currency} ${r.price}</span></div>
        </div>
        <div class="footer">
          Thank you for subscribing! Our team will verify your payment and activate your shop shortly.<br/>
          &copy; ${new Date().getFullYear()} Multi-Tenant POS System
        </div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

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

        // Fetch payment numbers
        const paymentRes = await fetch(`${API_BASE_URL}/public/payment-numbers`);
        if (paymentRes.ok) {
          const data = await paymentRes.json();
          setPaymentNumbers(data.payment_numbers || []);
        }

        // Fetch videos
        const videosRes = await fetch(`${API_BASE_URL}/public/videos`);
        if (videosRes.ok) {
          const data = await videosRes.json();
          setVideos(data.sort((a, b) => a.display_order - b.display_order));
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
    { label: 'Home', page: 'home', path: '/' },
    { label: 'About Us', page: 'about', path: '/about' },
    { label: 'Contact Us', page: 'contact', path: '/contact' },
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
                  onClick={() => { onNavigate(link.page); window.history.pushState({}, '', link.path); }}
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
              <button
                onClick={() => window.history.pushState({}, '', '/login')}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{ backgroundColor: '#D4E0E8', color: '#1a1a2e' }}
              >
                Login
              </button>
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
                onClick={() => { onNavigate(link.page); setMobileMenuOpen(false); window.history.pushState({}, '', link.path); }}
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
            <button
              onClick={() => { setMobileMenuOpen(false); window.history.pushState({}, '', '/login'); }}
              className="w-full text-left px-3 py-2.5 rounded-lg font-medium text-sm transition-colors"
              style={{ backgroundColor: '#D4E0E8', color: '#1a1a2e' }}
            >
              Login
            </button>
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
        <div className="flex flex-row gap-4 justify-center mb-24">
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

        {/* Videos Section */}
        {videos.length > 0 && (
          <div className="mb-24">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Video Tutorials</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Learn how to make the most of our POS system
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((video) => (
                <div key={video.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all">
                  {video.thumbnail_url ? (
                    <div 
                      className="relative h-48 bg-gray-100 cursor-pointer"
                      onClick={() => {
                        const youtubeVideoId = getYoutubeVideoId(video.video_url);
                        if (youtubeVideoId) {
                          setYoutubeVideoUrl(`https://www.youtube.com/embed/${youtubeVideoId}`);
                          setShowYoutubePopup(true);
                        } else {
                          window.open(video.video_url, '_blank');
                        }
                      }}
                    >
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="relative h-48 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center cursor-pointer"
                      onClick={() => {
                        const youtubeVideoId = getYoutubeVideoId(video.video_url);
                        if (youtubeVideoId) {
                          setYoutubeVideoUrl(`https://www.youtube.com/embed/${youtubeVideoId}`);
                          setShowYoutubePopup(true);
                        } else {
                          window.open(video.video_url, '_blank');
                        }
                      }}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{video.title}</h3>
                    {video.description && (
                      <p className="text-gray-600 text-sm leading-relaxed">{video.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                      {(Array.isArray(plan.features) ? plan.features : (typeof plan.features === 'string' ? (() => { try { return JSON.parse(plan.features); } catch(e) { return []; } })() : [])).map((feature, index) => (
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
                      onClick={() => handleOpenSubscriptionModal(plan)}
                      style={{ width: '100%' }}
                    >
                      {plan.button_text || 'Subscribe Now'}
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Public Subscription Request Modal & Receipt (Compact & Fully Responsive) */}
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg sm:max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 transition-all my-auto">
              
              {/* Modal Header (Compact) */}
              <div className="bg-slate-900 text-white px-5 py-3.5 shrink-0 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                      {receiptData ? 'Official Receipt' : 'Plan Subscription Request'}
                    </div>
                    <div className="flex items-baseline gap-2 truncate">
                      <h2 className="text-base sm:text-lg font-bold text-white truncate">
                        {selectedPlanForSub?.name || 'Subscription Plan'}
                      </h2>
                      <span className="text-emerald-400 font-extrabold text-xs sm:text-sm whitespace-nowrap">
                        {selectedPlanForSub?.currency || 'BDT'} {selectedPlanForSub?.price}
                        <span className="text-slate-400 font-normal text-[11px]">/{selectedPlanForSub?.billing_period}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body (Scrollable & Optimized Height) */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
                {receiptData ? (
                  /* ── Official Receipt Form (Compact & Clean) ── */
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-3">
                      {/* Receipt Header Badge */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/70">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm leading-tight">Request Confirmed!</h3>
                            <p className="text-[11px] text-emerald-700">Receipt: <span className="font-bold text-gray-900 font-mono">#SUB-{String(receiptData.id).padStart(5, '0')}</span></p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {receiptData.status}
                        </span>
                      </div>

                      {/* Receipt Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-white/90 rounded-lg border border-emerald-100">
                          <span className="text-gray-500 block text-[10px] font-medium">Subscriber</span>
                          <span className="font-bold text-gray-900 truncate block">{receiptData.subscriber_name}</span>
                        </div>
                        <div className="p-2 bg-white/90 rounded-lg border border-emerald-100">
                          <span className="text-gray-500 block text-[10px] font-medium">Shop / Business</span>
                          <span className="font-bold text-gray-900 truncate block">{receiptData.shop_name}</span>
                        </div>
                        <div className="p-2 bg-white/90 rounded-lg border border-emerald-100">
                          <span className="text-gray-500 block text-[10px] font-medium">Email</span>
                          <span className="font-semibold text-gray-800 truncate block">{receiptData.email}</span>
                        </div>
                        <div className="p-2 bg-white/90 rounded-lg border border-emerald-100">
                          <span className="text-gray-500 block text-[10px] font-medium">Phone</span>
                          <span className="font-semibold text-gray-800 truncate block">{receiptData.phone}</span>
                        </div>
                        <div className="p-2 bg-white/90 rounded-lg border border-emerald-100">
                          <span className="text-gray-500 block text-[10px] font-medium">Plan</span>
                          <span className="font-bold text-gray-900 truncate block">{receiptData.plan_name} ({receiptData.billing_period})</span>
                        </div>
                        <div className="p-2 bg-white/90 rounded-lg border border-emerald-100">
                          <span className="text-gray-500 block text-[10px] font-medium">Payment & Trx ID</span>
                          <span className="font-bold text-gray-900">{receiptData.payment_method}</span>
                          {receiptData.transaction_id && (
                            <span className="block text-slate-600 font-mono text-[10px] truncate">Trx: {receiptData.transaction_id}</span>
                          )}
                        </div>
                      </div>

                      {/* Total Amount Banner */}
                      <div className="p-2.5 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium uppercase text-[10px] tracking-wider">Total Payable Amount</span>
                        <span className="text-base font-extrabold text-emerald-400">{receiptData.currency} {receiptData.price}</span>
                      </div>

                      <div className="p-2 bg-white/80 rounded-lg text-[11px] text-gray-600 border border-emerald-100 leading-tight">
                        <p className="font-semibold text-gray-800">📌 Next Steps:</p>
                        Our Super Admin team will verify your transaction and activate your shop in <span className="font-bold text-gray-900">Manage Tenant Shops</span>.
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handlePrintReceipt}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-xs transition-all shadow flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print / Save Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSubscriptionModal(false)}
                        className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold text-xs transition-colors shadow"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Plan Subscription Request Form (Compact & Responsive) ── */
                  <form onSubmit={handleSubscribeSubmit} className="space-y-2.5">
                    {subErrorMsg && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-1.5">
                        <svg className="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">{subErrorMsg}</span>
                      </div>
                    )}

                    {/* Official Payment Accounts (Compact Chips) */}
                    {paymentNumbers && paymentNumbers.length > 0 && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                            <span>💳</span> Send Fee To Accounts
                          </span>
                          <span className="text-[10px] text-slate-500">Tap to select & copy</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {paymentNumbers.map((pn, idx) => {
                            const isSelected = subForm.payment_method?.toLowerCase() === pn.method?.toLowerCase();
                            return (
                              <div
                                key={idx}
                                onClick={() => setSubForm({ ...subForm, payment_method: pn.method })}
                                className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-1.5 ${
                                  isSelected
                                    ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-200'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="truncate">
                                  <div className="flex items-center gap-1 font-bold text-slate-900 text-[11px]">
                                    <span className="px-1 py-0.2 bg-slate-100 text-slate-700 text-[9px] rounded font-semibold">{pn.method}</span>
                                    <span className="truncate font-mono">{pn.number}</span>
                                  </div>
                                  {pn.account_name && (
                                    <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">{pn.account_name}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyNumber(pn.number);
                                  }}
                                  className="shrink-0 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition-colors"
                                  title="Copy Number"
                                >
                                  {copiedNumber === pn.number ? '✓ Copied' : 'Copy'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Plan Selector (if multiple plans) */}
                    {pricingPlans && pricingPlans.length > 1 && (
                      <div>
                        <label className="block text-gray-700 text-[11px] font-bold uppercase mb-0.5">Select Plan</label>
                        <select
                          value={selectedPlanForSub?.id || ''}
                          onChange={(e) => {
                            const found = pricingPlans.find(p => p.id === parseInt(e.target.value));
                            if (found) setSelectedPlanForSub(found);
                          }}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-gray-900 bg-white"
                        >
                          {pricingPlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {p.currency} {p.price}/{p.billing_period}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Row 1: Full Name + Shop Name (2 Cols Responsive) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-gray-700 text-[11px] font-bold uppercase mb-0.5">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={subForm.subscriber_name}
                          onChange={(e) => setSubForm({ ...subForm, subscriber_name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-[11px] font-bold uppercase mb-0.5">Shop / Business *</label>
                        <input
                          type="text"
                          required
                          value={subForm.shop_name}
                          onChange={(e) => setSubForm({ ...subForm, shop_name: e.target.value })}
                          placeholder="e.g. Modern Retail Store"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-gray-900"
                        />
                      </div>
                    </div>

                    {/* Row 2: Email + Phone (2 Cols Responsive) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-gray-700 text-[11px] font-bold uppercase mb-0.5">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={subForm.email}
                          onChange={(e) => setSubForm({ ...subForm, email: e.target.value })}
                          placeholder="your@email.com"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-[11px] font-bold uppercase mb-0.5">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={subForm.phone}
                          onChange={(e) => setSubForm({ ...subForm, phone: e.target.value })}
                          placeholder="+8801700000000"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-gray-900"
                        />
                      </div>
                    </div>

                    {/* Row 3: Payment Method + Transaction ID (2 Cols Responsive) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-gray-700 text-[11px] font-bold uppercase mb-0.5">Payment Method *</label>
                        <select
                          value={subForm.payment_method}
                          onChange={(e) => setSubForm({ ...subForm, payment_method: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-gray-900 bg-white font-medium"
                        >
                          <option value="bKash">bKash</option>
                          <option value="Nagad">Nagad</option>
                          <option value="Rocket">Rocket</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash / Cheque">Cash / Cheque</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-[11px] font-bold uppercase mb-0.5">Transaction ID (Trx ID) *</label>
                        <input
                          type="text"
                          required
                          value={subForm.transaction_id}
                          onChange={(e) => setSubForm({ ...subForm, transaction_id: e.target.value })}
                          placeholder="e.g. TRX982348"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-gray-900"
                        />
                      </div>
                    </div>

                    {/* Row 4: Notes (Compact Single-line) */}
                    <div>
                      <label className="block text-gray-700 text-[11px] font-bold uppercase mb-0.5">Special Notes / Requirements</label>
                      <input
                        type="text"
                        value={subForm.notes}
                        onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
                        placeholder="Any additional custom setup notes (optional)..."
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-gray-900"
                      />
                    </div>

                    {/* Form Footer Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setShowSubscriptionModal(false)}
                        className="px-3.5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={subSubmitting}
                        className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold text-xs transition-all shadow flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {subSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          'Confirm Subscription'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Login Section – Horizontal Layout ── */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-lg mb-24">
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

        {/* ── Hardware & Mobile POS Compatibility Showcase (Pre-Footer) ── */}
        <div className="mb-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <span>Hardware & Device Compatibility</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Run Your Store on Any Device, Anywhere
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Seamlessly connect with your existing retail hardware. Zero drivers needed — just plug, scan, and start selling.
            </p>
          </div>

          {/* Compatibility Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            
            {/* Thermal Printers */}
            <div className="group relative bg-white p-7 rounded-2xl border border-gray-200 hover:border-gray-900 transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                    ESC/POS · 58/80mm
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Thermal Receipt Printers</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Blazing-fast invoice and token printing over USB, Bluetooth, or LAN/WiFi. Supports custom headers, shop logo, and QR payment codes.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">USB / Bluetooth</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">LAN / Network</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Auto-Cutter</span>
              </div>
            </div>

            {/* Barcode & QR Scanners */}
            <div className="group relative bg-white p-7 rounded-2xl border border-gray-200 hover:border-gray-900 transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-100">
                    1D / 2D / QR Code
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Barcode & QR Scanners</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Instant item lookup and quick multi-tab billing. Works with wireless 2.4G dongles, Bluetooth guns, and desktop hands-free omni scanners.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Wireless 2.4G</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Hands-free Omni</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Instant Cart Add</span>
              </div>
            </div>

            {/* Tablets & Mobile POS */}
            <div className="group relative bg-white p-7 rounded-2xl border border-gray-200 hover:border-gray-900 transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    iPad · Android · Phone
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tablets, Mobiles & Touch POS</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Turn any iPad, Android tablet, smartphone, or dedicated all-in-one touch terminal into a modern point of sale station with fluid responsive UI.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">iOS / Android</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Touch Terminals</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Floor Sales Mode</span>
              </div>
            </div>

            {/* Electronic Cash Drawers */}
            <div className="group relative bg-white p-7 rounded-2xl border border-gray-200 hover:border-gray-900 transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                    RJ11 / RJ12 · 12V/24V
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Electronic Cash Drawers</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Automatic drawer ejection upon cash receipt printing. Secure coin and banknote compartments with emergency manual key release.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDrawerModal(true)}
                  className="w-full mb-3 py-2 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <span>⚡ Test Interactive Cash Drawer Demo</span>
                  <span>&rarr;</span>
                </button>
              </div>
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Auto-Kick Signal</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Dual Bill Slots</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Anti-Theft Lock</span>
              </div>
            </div>

            {/* Barcode & Price Tag Label Printers */}
            <div className="group relative bg-white p-7 rounded-2xl border border-gray-200 hover:border-gray-900 transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                    Label & Sticker
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Barcode Label & Sticker Printers</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Print custom adhesive price stickers, shelf tags, and product barcodes directly from your inventory screen with batch generation.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Direct Thermal</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Custom Dimensions</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Batch Printing</span>
              </div>
            </div>

            {/* Cloud Sync & Multi-Terminal */}
            <div className="group relative bg-white p-7 rounded-2xl border border-gray-200 hover:border-gray-900 transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full border border-cyan-100">
                    Live Sync · 99.9% Uptime
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Multi-Terminal Cloud Sync</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Operate multiple checkout counters and branches simultaneously with instantaneous stock level synchronization and real-time reports.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Realtime WebSockets</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Multi-Branch</span>
                <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Automated Backup</span>
              </div>
            </div>

          </div>

          {/* Supported Brand Ecosystem Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-8 shadow-xl border border-slate-700 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 text-emerald-400 font-bold text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Universal Hardware Compatibility</span>
              </div>
              <h4 className="text-2xl font-extrabold text-white">Have existing hardware in your store?</h4>
              <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                Our system works out of the box with <strong className="text-white">Epson, Xprinter, Sunmi, Zebra, Honeywell, Posiflex, Bixolon</strong>, and all standard ESC/POS USB, Bluetooth, and Network peripherals.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Hardware Consultation
              </button>
              <button
                type="button"
                onClick={() => setShowLoginPopup(true)}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Test in Live Demo
              </button>
            </div>
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

      {/* Electronic Cash Drawer Interactive Simulation Modal */}
      <ElectronicCashDrawerModal
        isOpen={showDrawerModal}
        onClose={() => setShowDrawerModal(false)}
      />

      <Footer onNavigate={onNavigate} />
    </div>
  );
}