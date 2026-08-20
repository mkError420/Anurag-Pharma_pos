import React, { useState, useEffect, useRef } from 'react';
import Footer from './Footer';
import API_BASE_URL from '../config';
import AnimatedButton from './AnimatedButton';

export default function AboutUs({ onNavigate, publicPage }) {
  const [logo, setLogo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Hide mobile menu on outside click or touch anywhere on the display
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (mobileMenuOpen && navRef.current && !navRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Home', page: 'home', path: '/' },
    { label: 'About Us', page: 'about', path: '/about' },
    { label: 'Contact Us', page: 'contact', path: '/contact' },
  ];

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

        // Fetch team members
        const teamResponse = await fetch(`${API_BASE_URL}/public/team-members`);
        if (teamResponse.ok) {
          const data = await teamResponse.json();
          setTeamMembers(data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Intersection Observer for team card stagger animation
  const [visibleTeam, setVisibleTeam] = useState(new Set());
  const teamRefs = useRef([]);

  useEffect(() => {
    if (teamMembers.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.idx);
            setTimeout(() => {
              setVisibleTeam((prev) => new Set([...prev, idx]));
            }, idx * 120);
          }
        });
      },
      { threshold: 0.15 }
    );
    teamRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [teamMembers]);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .site-logo-shimmer {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(110deg, #0f172a 30%, #38bdf8 50%, #0f172a 70%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        /* Team card animations */
        .team-card-enter {
          opacity: 0;
          transform: translateY(40px) scale(0.96);
          transition: opacity 0.55s cubic-bezier(.4,0,.2,1), transform 0.55s cubic-bezier(.4,0,.2,1);
        }
        .team-card-enter.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .team-card-hover {
          transition: transform 0.28s cubic-bezier(.4,0,.2,1), box-shadow 0.28s ease;
        }
        .team-card-hover:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 24px 48px -8px rgba(99,102,241,0.18), 0 8px 24px -4px rgba(0,0,0,0.10);
        }
        .founder-glow:hover {
          box-shadow: 0 0 0 4px rgba(99,102,241,0.15), 0 32px 64px -12px rgba(99,102,241,0.25);
        }
        .avatar-ring {
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4);
          padding: 3px;
          border-radius: 50%;
        }
        .avatar-ring-founder {
          background: linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6);
          padding: 4px;
          border-radius: 50%;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .founder-float {
          animation: float 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* Mobile Menu Backdrop Overlay to dismiss on display click */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-30 sm:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Navbar */}
      <nav ref={navRef} className="bg-white border-b border-gray-200 sticky top-9 z-40 shadow-sm">
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

      {/* About Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Classic Hero Section */}
        <div className="text-center mb-24">
          <div className="inline-block border-t-2 border-b-2 border-gray-800 py-4 px-12 mb-8">
            <h1 className="text-5xl font-serif font-bold text-gray-900 mb-2">
              About Our Company
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed italic font-serif">
            "Excellence in Point of Sale Solutions Since Our Foundation"
          </p>
        </div>

        {/* Classic Story Section */}
        <div className="mb-24">
          <div className="max-w-4xl mx-auto">
            <div className="border-l-4 border-gray-800 pl-8 mb-12">
              <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-gray-700 leading-loose mb-4 text-lg">
                Founded with a vision to revolutionize retail management, our POS System has grown to become a trusted solution for businesses of all sizes. We understand the challenges that modern businesses face, and we've built our platform to address those needs head-on.
              </p>
              <p className="text-gray-700 leading-loose text-lg">
                From small local shops to multi-location enterprises, our system scales to meet your needs while maintaining simplicity and ease of use. Our journey has been marked by continuous innovation and an unwavering commitment to our customers' success.
              </p>
            </div>

            <div className="border-l-4 border-gray-800 pl-8">
              <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-gray-700 leading-loose text-lg">
                To empower businesses with technology that simplifies operations, provides actionable insights, and drives growth. We believe that every business deserves access to enterprise-grade tools that are easy to use and affordable. Our mission is to bridge the gap between complex technology and practical business needs.
              </p>
            </div>
          </div>
        </div>

        {/* Classic Values Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-serif font-bold text-gray-900 text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 border border-gray-200 bg-white">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-serif font-bold text-xl mb-3">Trust & Security</h3>
              <p className="text-gray-600 leading-relaxed">Your data security is our top priority. We use industry-standard encryption and security practices.</p>
            </div>

            <div className="text-center p-8 border border-gray-200 bg-white">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-serif font-bold text-xl mb-3">Innovation</h3>
              <p className="text-gray-600 leading-relaxed">We continuously evolve our platform with new features and improvements based on customer feedback.</p>
            </div>

            <div className="text-center p-8 border border-gray-200 bg-white">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-serif font-bold text-xl mb-3">Customer Focus</h3>
              <p className="text-gray-600 leading-relaxed">Our customers are at the heart of everything we do. Your success is our success.</p>
            </div>
          </div>
        </div>

        {/* ── Meet Our Team ── */}
        <div className="mb-24">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.3em] text-indigo-500 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-4">Our People</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Meet Our Team</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mx-auto mb-6"></div>
            <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
              A passionate group of innovators dedicated to building the best POS experience for businesses everywhere.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">No team members to display yet.</p>
            </div>
          ) : (() => {
            const founders = teamMembers.filter(m =>
              m.role.toLowerCase().includes('founder') ||
              m.role.toLowerCase().includes('ceo') ||
              m.role.toLowerCase().includes('co-founder')
            );
            const others = teamMembers.filter(m =>
              !m.role.toLowerCase().includes('founder') &&
              !m.role.toLowerCase().includes('ceo') &&
              !m.role.toLowerCase().includes('co-founder')
            );
            let globalIdx = 0;

            return (
              <div>
                {/* ── Founder / CEO Spotlight Row ── */}
                {founders.length > 0 && (
                  <div className="mb-16">
                    <div className="flex flex-wrap justify-center gap-8">
                      {founders.map((member) => {
                        const idx = globalIdx++;
                        return (
                          <div
                            key={member.id}
                            ref={(el) => { teamRefs.current[idx] = el; }}
                            data-idx={idx}
                            className={`team-card-enter founder-glow team-card-hover ${
                              visibleTeam.has(idx) ? 'visible' : ''
                            } relative bg-white rounded-3xl border border-slate-100 p-8 flex flex-col items-center w-64 shadow-lg`}
                          >
                            {/* Premium badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow">
                                {member.role.toLowerCase().includes('ceo') ? '⭐ CEO' : '🏆 Founder'}
                              </span>
                            </div>

                            {/* Avatar with gradient ring + float animation */}
                            <div className="avatar-ring-founder founder-float mb-5 mt-2">
                              <div className="bg-white rounded-full p-0.5">
                                {member.image_url ? (
                                  <img
                                    src={member.image_url}
                                    alt={member.name}
                                    className="w-28 h-28 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                    <span className="text-4xl font-black text-indigo-600">{member.name.charAt(0)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <h3 className="text-gray-900 font-extrabold text-xl mb-1 text-center">{member.name}</h3>
                            <span className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-bold px-3 py-1 rounded-full mb-3">
                              {member.role}
                            </span>
                            {member.bio && (
                              <p className="text-gray-500 text-xs text-center leading-relaxed mt-1">{member.bio}</p>
                            )}

                            {/* Decorative bottom shimmer line */}
                            <div className="absolute bottom-0 left-8 right-8 h-0.5 rounded-full bg-gradient-to-r from-transparent via-indigo-300 to-transparent"></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Team Members Grid ── */}
                {others.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {others.map((member) => {
                      const idx = globalIdx++;
                      return (
                        <div
                          key={member.id}
                          ref={(el) => { teamRefs.current[idx] = el; }}
                          data-idx={idx}
                          className={`team-card-enter team-card-hover ${
                            visibleTeam.has(idx) ? 'visible' : ''
                          } bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center shadow-sm hover:border-indigo-200`}
                        >
                          {/* Avatar with gradient ring */}
                          <div className="avatar-ring mb-4">
                            <div className="bg-white rounded-full p-0.5">
                              {member.image_url ? (
                                <img
                                  src={member.image_url}
                                  alt={member.name}
                                  className="w-20 h-20 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-indigo-100 flex items-center justify-center">
                                  <span className="text-2xl font-black text-indigo-500">{member.name.charAt(0)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <h3 className="text-gray-900 font-bold text-base mb-1 text-center">{member.name}</h3>
                          <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            {member.role}
                          </span>
                          {member.bio && (
                            <p className="text-gray-400 text-[11px] text-center leading-relaxed mt-2 line-clamp-2">{member.bio}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Classic Quote Section */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Founding Philosophy */}
            <div className="text-center border-t-2 border-b-2 border-gray-200 py-12 px-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-9.57 1.413 0 2.286.146 3.676.647.326.134.526.46.526.825v3.478c0 .365-.197.693-.526.825-1.39-.58-2.263-.647-3.676-.647-5.252 0-5.704 3.731-9.57 8.983-9.57v7.391H21V21h-6.983zM8.017 21v-7.391c0-5.704 3.731-9.57 8.983-9.57 1.413 0 2.286.146 3.676.647.326.134.526.46.526.825v3.478c0 .365-.197.693-.526.825-1.39-.58-2.263-.647-3.676-.647-5.252 0-5.704 3.731-9.57 8.983-9.57v7.391H21V21H8.017z"/>
              </svg>
              <p className="text-xl font-serif text-gray-700 italic leading-relaxed mb-6">
                Success is not just about making sales. It's about building relationships, understanding needs, and delivering solutions that truly make a difference in our customers' businesses.
              </p>
              <p className="text-gray-500 font-semibold">— Our Founding Philosophy</p>
            </div>

            {/* CEO Philosophy */}
            <div className="text-center border-t-2 border-b-2 border-gray-200 py-12 px-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-9.57 1.413 0 2.286.146 3.676.647.326.134.526.46.526.825v3.478c0 .365-.197.693-.526.825-1.39-.58-2.263-.647-3.676-.647-5.252 0-5.704 3.731-9.57 8.983-9.57v7.391H21V21h-6.983zM8.017 21v-7.391c0-5.704 3.731-9.57 8.983-9.57 1.413 0 2.286.146 3.676.647.326.134.526.46.526.825v3.478c0 .365-.197.693-.526.825-1.39-.58-2.263-.647-3.676-.647-5.252 0-5.704 3.731-9.57 8.983-9.57v7.391H21V21H8.017z"/>
              </svg>
              <p className="text-xl font-serif text-gray-700 italic leading-relaxed mb-6">
                Innovation is not just about technology—it's about people. We believe in empowering our team to think creatively, take ownership, and push boundaries to create solutions that exceed expectations.
              </p>
              <p className="text-gray-500 font-semibold">— CEO Philosophy</p>
            </div>
          </div>
        </div>

        {/* Classic Timeline Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-gray-900 text-center mb-12">Our Journey</h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-16 flex-shrink-0 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center mx-auto font-bold">1</div>
                <div className="w-0.5 h-full bg-gray-200 mx-auto mt-2"></div>
              </div>
              <div className="pb-8">
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Foundation</h3>
                <p className="text-gray-600 leading-relaxed">Started with a simple vision to make POS technology accessible to every business.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-16 flex-shrink-0 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center mx-auto font-bold">2</div>
                <div className="w-0.5 h-full bg-gray-200 mx-auto mt-2"></div>
              </div>
              <div className="pb-8">
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Growth</h3>
                <p className="text-gray-600 leading-relaxed">Expanded our features and user base, becoming a trusted name in the industry.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-16 flex-shrink-0 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center mx-auto font-bold">3</div>
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Innovation</h3>
                <p className="text-gray-600 leading-relaxed">Continuously evolving with cutting-edge technology and customer-driven improvements.</p>
              </div>
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