/**
 * Vector logo matching `src/dashboard/fbr_welcome.svg` (Welcome card).
 * Keep visual sync when editing the source SVG.
 */
import * as React from 'react';
import {
    Svg,
    Defs,
    LinearGradient,
    Stop,
    Path,
    G,
    Circle,
    Text,
} from '@react-pdf/renderer';

type Props = {
    /** Total width in PDF points (default compact for invoice header). */
    width?: number;
    height?: number;
};

export function FbrWelcomeLogoPdf({ width = 92, height = 46 }: Props) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid meet"
        >
            <Defs>
                <LinearGradient id="invPdfFbrGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#00AEEF" />
                    <Stop offset="1" stopColor="#003399" />
                </LinearGradient>
                <LinearGradient id="invPdfArcGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#2E7D32" />
                    <Stop offset="0.5" stopColor="#76B57B" />
                    <Stop offset="1" stopColor="#2E7D32" />
                </LinearGradient>
            </Defs>

            <G transform="translate(50, 50) scale(0.6)">
                <Path d="M40 25H160C205 25 240 60 240 105C240 150 205 185 160 185H105V155H160C188 155 210 133 210 105C210 77 188 55 160 55H70V105H40V25Z" fill="#325DAA" />
                <Path d="M40 115H105V145H70V185H40V115Z" fill="#76B57B" />
                <Text
                    x={260}
                    y={90}
                    style={{ fontFamily: 'Helvetica-Bold', fontSize: 64 }}
                    fill="#8E9191"
                >
                    DIGITAL
                </Text>
                <Text
                    x={260}
                    y={165}
                    style={{ fontFamily: 'Helvetica-Bold', fontSize: 72 }}
                    fill="#8E9191"
                >
                    INVOICING
                </Text>
            </G>

            <G transform="translate(100, 220)">
                <Path
                    d="M50,80 Q300,-20 550,80"
                    stroke="url(#invPdfArcGrad)"
                    strokeWidth={12}
                    fill="none"
                    strokeLinecap="round"
                />
                <Path
                    d="M300,10 L300,50 M280,30 L320,30"
                    stroke="#FFD700"
                    strokeWidth={4}
                    strokeLinecap="round"
                />
                <Circle cx={300} cy={30} r={8} fill="#FFCC00" opacity={0.8} />
                <Text
                    x={300}
                    y={110}
                    style={{ fontFamily: 'Helvetica-Bold', fontSize: 100 }}
                    fill="url(#invPdfFbrGrad)"
                    textAnchor="middle"
                >
                    FBR
                </Text>
                <Text
                    x={300}
                    y={150}
                    style={{ fontFamily: 'Helvetica-Bold', fontSize: 28 }}
                    fill="#003399"
                    textAnchor="middle"
                >
                    PAKISTAN
                </Text>
            </G>
        </Svg>
    );
}
