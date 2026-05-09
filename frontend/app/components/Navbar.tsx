'use client';

import { useState } from 'react';
import Image from 'next/image';

const navLinks = [
  { label: 'الرئيسية', href: '#' },
  { label: 'كيف يعمل', href: '#how-it-works' },
  { label: 'تواصل معنا', href: '#contact' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">

          {/* Brand — Logo + Name */}
          <a href="#" className="navbar-brand">

            <span className="navbar-brand-name" style={{ fontStyle: 'italic', direction: 'ltr', display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, letterSpacing: '-1px' }}>
                <span style={{ 
                  color: '#3279f9', 
                  borderBottom: '2px solid #3279f9',
                  paddingBottom: '1px',
                  textShadow: '0 0 10px rgba(50, 121, 249, 0.2)'
                }}>ME</span>ETINGS
              </span>
              <span style={{ fontWeight: 300, opacity: 0.7, marginLeft: '6px', fontSize: '0.9em' }}>
                management
              </span>
            </span>
          </a>



          {/* Nav Links moved to the left */}
          <ul className="navbar-nav" role="navigation" aria-label="القائمة الرئيسية">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>

          {/* Mobile Hamburger */}
          <button
            className="navbar-hamburger"
            aria-label="فتح القائمة"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid var(--charcoal-trans)',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '8px',
              color: 'var(--deep-charcoal)',
            }}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect y="3" width="18" height="1.5" rx="0.75" fill="currentColor" />
                <rect y="8.25" width="18" height="1.5" rx="0.75" fill="currentColor" />
                <rect y="13.5" width="18" height="1.5" rx="0.75" fill="currentColor" />
              </svg>
            )}
          </button>

        </div>
      </nav>

      {/* Mobile Drawer — Typer warm palette */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            zIndex: 999,
            background: 'var(--cream-light)',
            borderBottom: '1px solid var(--charcoal-trans)',
            padding: '12px 20px 20px',
            boxShadow: 'var(--shadow-level-2)',
          }}
          className="animate-fade-in"
        >
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '48px',
                    padding: '0 12px',
                    color: 'var(--deep-charcoal)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    borderBottom: '1px solid var(--charcoal-trans)',
                    transition: 'background 0.2s ease',
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '16px' }}>
            <a
              href="#upload"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setMenuOpen(false)}
            >
              ابدأ الآن
            </a>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 599px) {
          .navbar-nav, .navbar-cta { display: none !important; }
          .navbar-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
