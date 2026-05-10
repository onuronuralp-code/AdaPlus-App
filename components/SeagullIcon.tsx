import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SeagullIconProps {
  size?: number;
  color?: string;
}

export const SeagullIcon: React.FC<SeagullIconProps> = ({ size = 200, color = "#0F172A" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Balanced V-shape flying seagull */}
      <Path
        d="M5 40C25 38 45 50 50 55C55 50 75 38 95 40C80 43 60 55 50 62C40 55 20 43 5 40Z"
        fill={color}
      />
    </Svg>
  );
};
