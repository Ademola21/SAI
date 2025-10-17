
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-500">
        Sportybet AI Predictor
      </h1>
      <p className="mt-2 text-lg text-slate-400">
        Upload match screenshots, let Gemini analyze, and get your prediction ticket.
      </p>
    </header>
  );
};

export default Header;
