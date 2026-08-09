import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

export default function Footer({ onNavigate }) {
  const [contactInfo, setContactInfo] = useState({
    email_addresses: [],
    phone_numbers: [],
    address: ''
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/public/contact-information`);
        if (response.ok) {
          const data = await response.json();
          setContactInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch contact information:', err);
      }
    };
    fetchContactInfo();
  }, []);

  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h4 className="text-white font-semibold mb-4">About POS System</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              A powerful and intuitive point of sale solution for modern businesses.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {onNavigate && (
                <>
                  <li>
                    <button onClick={() => onNavigate('home')} className="text-gray-400 hover:text-white transition-colors text-sm">Home</button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('about')} className="text-gray-400 hover:text-white transition-colors text-sm">About Us</button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('contact')} className="text-gray-400 hover:text-white transition-colors text-sm">Contact Us</button>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-white font-semibold mb-4">Features</h4>
            <ul className="space-y-2">
              <li className="text-gray-400 text-sm">Inventory Management</li>
              <li className="text-gray-400 text-sm">Sales Analytics</li>
              <li className="text-gray-400 text-sm">Multi-location Support</li>
              <li className="text-gray-400 text-sm">Customer Management</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2">
              {contactInfo.email_addresses && contactInfo.email_addresses.length > 0 ? (
                <li className="text-gray-400 text-sm">{contactInfo.email_addresses[0]}</li>
              ) : (
                <li className="text-gray-400 text-sm">No email available</li>
              )}
              {contactInfo.phone_numbers && contactInfo.phone_numbers.length > 0 ? (
                <li className="text-gray-400 text-sm">{contactInfo.phone_numbers[0]}</li>
              ) : (
                <li className="text-gray-400 text-sm">No phone available</li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} POS System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
