import React from 'react';

export default function AnimatedButton({ children, onClick, href, className = '', style = {}, ...props }) {
  const buttonContent = (
    <>
      <span className="btn--svg__label">{children}</span>
      <svg width="190" x="0px" y="0px" viewBox="0 0 60 60" enable-background="new 0 0 60 60" className="btn--svg__circle">
        <circle fill="#FFFFFF" cx="30" cy="30" r="28.7" className="js-discover-circle" />
      </svg>
      <svg x="0px" y="0px" preserveAspectRatio="none" viewBox="2 29.3 56.9 13.4" enable-background="new 2 29.3 56.9 13.4" width="190" className="btn--svg__border">
        <g id="Calque_2" className="btn--svg__border--left js-discover-left-border">
          <path fill="none" stroke="#FFF" strokeWidth="0.5" strokeMiterlimit="1" d="M30.4,41.9H9c0,0-6.2-0.3-6.2-5.9S9,30.1,9,30.1h21.4" />
        </g>
        <g id="Calque_3" className="btn--svg__border--right js-discover-right-border">
          <path fill="none" stroke="#FFF" strokeWidth="0.5" strokeMiterlimit="1" d="M30.4,41.9h21.5c0,0,6.1-0.4,6.1-5.9s-6-5.9-6-5.9H30.4" />
        </g>
      </svg>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`btn btn--svg js-animated-button ${className}`}
        style={style}
        {...props}
      >
        {buttonContent}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`btn btn--svg js-animated-button ${className}`}
      style={style}
      {...props}
    >
      {buttonContent}
    </button>
  );
}
