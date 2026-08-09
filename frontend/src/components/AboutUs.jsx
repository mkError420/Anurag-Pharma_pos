import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

export default function AboutUs({ onNavigate }) {
  const [logo, setLogo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="Logo" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">POS</span>
                </div>
              )}
              <span className="text-gray-900 font-bold text-2xl">POS System</span>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-8">
              <button
                onClick={() => onNavigate('home')}
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('about')}
                className="text-gray-900 hover:text-gray-900 transition-colors font-medium"
              >
                About Us
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* About Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            About <span className="text-gray-700">Us</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We are dedicated to providing businesses with powerful, intuitive, and reliable point of sale solutions.
          </p>
        </div>

        {/* Our Story */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 mb-8 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Founded with a vision to revolutionize retail management, our POS System has grown to become a trusted solution for businesses of all sizes. We understand the challenges that modern businesses face, and we've built our platform to address those needs head-on.
          </p>
          <p className="text-gray-600 leading-relaxed">
            From small local shops to multi-location enterprises, our system scales to meet your needs while maintaining simplicity and ease of use.
          </p>
        </div>

        {/* Our Mission */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 mb-8 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            To empower businesses with technology that simplifies operations, provides actionable insights, and drives growth. We believe that every business deserves access to enterprise-grade tools that are easy to use and affordable.
          </p>
        </div>

        {/* Our Values */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-semibold text-lg mb-2">Trust & Security</h3>
            <p className="text-gray-600 text-sm">Your data security is our top priority. We use industry-standard encryption and security practices.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-semibold text-lg mb-2">Innovation</h3>
            <p className="text-gray-600 text-sm">We continuously evolve our platform with new features and improvements based on customer feedback.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-semibold text-lg mb-2">Customer Focus</h3>
            <p className="text-gray-600 text-sm">Our customers are at the heart of everything we do. Your success is our success.</p>
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Team</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Our team consists of experienced professionals passionate about technology and retail. From developers to support specialists, everyone at our company is committed to delivering the best possible experience for our customers.
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No team members to display at this time.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <div key={member.id} className="text-center">
                  {member.image_url ? (
                    <img
                      src={member.image_url}
                      alt={member.name}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                      <span className="text-gray-600 font-semibold">{member.name.charAt(0)}</span>
                    </div>
                  )}
                  <h3 className="text-gray-900 font-semibold">{member.name}</h3>
                  <p className="text-gray-600 text-sm">{member.role}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-400 text-sm">
            <p>&copy; 2024 POS System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}