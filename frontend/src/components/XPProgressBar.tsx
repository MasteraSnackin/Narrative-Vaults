import React from 'react';

interface XPProgressBarProps {
  currentXP: number;
  currentLevel: number;
  nextLevelThreshold: number;
}

const XPProgressBar: React.FC<XPProgressBarProps> = ({
  currentXP,
  currentLevel,
  nextLevelThreshold,
}) => {
  const progress = (currentXP / nextLevelThreshold) * 100;

  return (
    <div className="w-full bg-gray-700 rounded-full h-4 mb-4 relative">
      <div
        className="bg-yellow-500 h-4 rounded-full"
        style={{ width: `${Math.min(100, progress)}%` }}
      ></div>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        XP: {currentXP} / {nextLevelThreshold} (Level {currentLevel})
      </div>
    </div>
  );
};

export default XPProgressBar;
