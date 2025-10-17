import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string | null;
}

const Toast: React.FC<ToastProps> = ({ message }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2800); // A bit shorter than the App's timer to allow for fade-out
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg shadow-lg text-white transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100 bg-slate-700' : 'translate-x-full opacity-0'
      }`}
    >
      {message}
    </div>
  );
};

export default Toast;
