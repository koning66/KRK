// src/WelcomeSplash.tsx
import React from 'react';

const WelcomeSplash: React.FC = () => {
  return (
    <div className="welcome-splash">
      <div className="welcome-splash__logo">
        {/* 👇 這裡是你的 App icon（放在 public 底下） */}
        <img src="/welcome512.png" alt="BodyMetrics logo" />
      </div>
    </div>
  );
};

export default WelcomeSplash;
