import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface AbstractPatternProps {
  color: string;
}

export const AbstractPattern: React.FC<AbstractPatternProps> = ({ color }) => {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" style={{ borderRadius: 12 }}>
        <Defs>
          <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
          </LinearGradient>
          <LinearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>
        
        {/* Vertical background gradient */}
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgGrad)" />

        {/* Soft colored organic shape at the top right */}
        <Path 
          d="M100,-20 C150,-10 220,20 180,80 C140,140 80,100 50,60 C20,20 50,-30 100,-20 Z" 
          fill="url(#grad2)" 
        />
        
        {/* Large white wave sweeping across */}
        <Path 
          d="M-20,100 C40,70 100,120 160,80 C200,50 220,100 220,180 L-20,180 Z" 
          fill="url(#grad1)" 
        />
        
        {/* Small floating elements for premium feel */}
        <Circle cx="30" cy="30" r="15" fill={color} opacity="0.04" />
        <Circle cx="170" cy="120" r="8" fill="#FFFFFF" opacity="0.6" />
        <Circle cx="185" cy="105" r="3" fill={color} opacity="0.1" />
      </Svg>
    </View>
  );
};
