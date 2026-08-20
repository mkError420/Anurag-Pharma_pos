import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

export default function TopInfoBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [contact, setContact] = useState({ email_addresses: [], phone_numbers: [] });

  // Live clock — tick every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch contact info once
  useEffect(() => {
    fetch(`${API_BASE_URL}/public/contact-information`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setContact(data); })
      .catch(() => {});
  }, []);

  const phone = (contact.phone_numbers || [])[0] || '';
  const email = (contact.email_addresses || [])[0] || '';

  return (
    <div className="bg-gray-900 text-gray-300 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-9 gap-4">

          {/* Left: Phone & Email */}
          <div className="flex items-center gap-5 overflow-hidden">

            {/* Phone */}
            <a
              href={phone ? `tel:${phone}` : undefined}
              className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{phone || '+880 1XXX-XXXXXX'}</span>
            </a>

            {/* Divider */}
            <span className="hidden sm:block h-3.5 w-px bg-gray-600" />

            {/* Email */}
            <a
              href={email ? `mailto:${email}` : undefined}
              className="hidden sm:flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{email || 'info@codexxaa.com'}</span>
            </a>
          </div>

          {/* Right: Live Date & Time */}
          <div className="flex items-center gap-4 flex-shrink-0">

            {/* Date */}
            <div className="hidden sm:flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {currentTime.toLocaleDateString('en-GB', {
                  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                })}
              </span>
            </div>

            <span className="hidden sm:block h-3.5 w-px bg-gray-600" />

            {/* Time */}
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono tracking-wide">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                })}
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
