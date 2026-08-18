// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Filter,
  FeGaussianBlur,
  FeOffset,
  FeComponentTransfer,
  FeFuncA,
  FeMerge,
  FeMergeNode,
  G,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
} from 'react-native-svg'

interface AndojoFlightLogoProps {
  width?: number
  height?: number
}

export const AndojoFlightLogo: React.FC<AndojoFlightLogoProps> = ({
  width = 200,
  height = 200,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 500 600">
      <Defs>
        {/* Airplane gradient with purple-pink theme */}
        <LinearGradient id="planeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#662fff" stopOpacity="1" />
          <Stop offset="100%" stopColor="#f45baf" stopOpacity="1" />
        </LinearGradient>

        {/* White gradient for details */}
        <LinearGradient id="whiteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="100%" stopColor="#E8E8E8" stopOpacity="1" />
        </LinearGradient>

        {/* Shadow filter */}
        <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur in="SourceAlpha" stdDeviation="8" />
          <FeOffset dx="0" dy="4" result="offsetblur" />
          <FeComponentTransfer>
            <FeFuncA type="linear" slope="0.3" />
          </FeComponentTransfer>
          <FeMerge>
            <FeMergeNode />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>

      {/* Airplane forming letter A */}
      <G transform="translate(250, 300)" filter="url(#shadow)">
        {/* Main fuselage body */}
        <Ellipse
          cx="0"
          cy="0"
          rx="100"
          ry="220"
          fill="url(#whiteGradient)"
          stroke="url(#planeGradient)"
          strokeWidth="10"
        />

        {/* Left wing forming left side of A */}
        <Path
          d="M -30 -60 L -200 180 L -175 215 L -30 50 Z"
          fill="url(#planeGradient)"
          stroke="url(#planeGradient)"
          strokeWidth="8"
        />

        {/* Right wing forming right side of A */}
        <Path
          d="M 30 -60 L 200 180 L 175 215 L 30 50 Z"
          fill="url(#planeGradient)"
          stroke="url(#planeGradient)"
          strokeWidth="8"
        />

        {/* Horizontal stabilizer/crossbar of A */}
        <Rect
          x="-140"
          y="30"
          width="280"
          height="50"
          fill="url(#planeGradient)"
          stroke="url(#planeGradient)"
          strokeWidth="6"
          rx="6"
        />

        {/* Tail fin */}
        <Path
          d="M -22 -130 L 0 -190 L 22 -130 Z"
          fill="url(#planeGradient)"
          stroke="url(#planeGradient)"
          strokeWidth="6"
        />

        {/* Cockpit windows */}
        <Ellipse cx="0" cy="-80" rx="25" ry="30" fill="#662fff" opacity="0.6" />

        {/* Engine details */}
        <Ellipse
          cx="-100"
          cy="20"
          rx="30"
          ry="45"
          fill="url(#whiteGradient)"
          stroke="url(#planeGradient)"
          strokeWidth="5"
        />
        <Ellipse
          cx="100"
          cy="20"
          rx="30"
          ry="45"
          fill="url(#whiteGradient)"
          stroke="url(#planeGradient)"
          strokeWidth="5"
        />

        {/* Red dot pattern on tail (like andojo branding) */}
        <Circle cx="-12" cy="-135" r="6" fill="#f45baf" />
        <Circle cx="5" cy="-128" r="5" fill="#f45baf" />
        <Circle cx="18" cy="-135" r="6" fill="#f45baf" />
        <Circle cx="0" cy="-118" r="5" fill="#f45baf" />
        <Circle cx="12" cy="-114" r="4" fill="#f45baf" />
        <Circle cx="-8" cy="-122" r="4" fill="#f45baf" />
      </G>

      {/* Motion trails */}
      <G opacity="0.4" transform="translate(250, 300)">
        <Line
          x1="-230"
          y1="80"
          x2="-280"
          y2="105"
          stroke="#999"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Line
          x1="-220"
          y1="120"
          x2="-265"
          y2="140"
          stroke="#999"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1="230"
          y1="80"
          x2="280"
          y2="105"
          stroke="#999"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Line
          x1="220"
          y1="120"
          x2="265"
          y2="140"
          stroke="#999"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  )
}
