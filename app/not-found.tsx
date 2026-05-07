"use client";

import Link from "next/link";
import { Box, Button, Typography, keyframes } from "@mui/material";

// ── Animations ──────────────────────────────────────────────────────────────
const float404 = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-10px); }
`;

const floatScene = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-12px); }
`;

const zzzAnim = keyframes`
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50%       { opacity: 1;   transform: translateY(-7px); }
`;

const bobHead = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25%       { transform: rotate(-5deg); }
  75%       { transform: rotate(5deg); }
`;

const pulseX = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.65; }
`;

const spinClock = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.3; transform: scale(0.7); }
`;

const glide = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50%       { transform: translate(8px, -5px) rotate(3deg); }
`;

// ── Illustration (pure SVG, no external deps) ────────────────────────────────
function Illustration() {
  return (
    <Box
      component="svg"
      viewBox="0 0 580 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      sx={{
        width: "100%",
        maxWidth: { xs: 340, sm: 420, md: 540 },
        animation: `${floatScene} 4s ease-in-out infinite`,
      }}
    >
      {/* BG blobs */}
      <ellipse cx="340" cy="270" rx="230" ry="210" fill="#dce8fd" opacity=".7" />
      <ellipse cx="330" cy="265" rx="195" ry="175" fill="#e8f0fe" opacity=".8" />

      {/* ── DESK ── */}
      <rect x="100" y="330" width="420" height="18" rx="6" fill="#1a3a7a" />
      <rect x="120" y="348" width="380" height="90" rx="4" fill="#1e4494" />
      <rect x="340" y="362" width="120" height="34" rx="4" fill="#1a3a7a" />
      <rect x="348" y="375" width="45" height="8" rx="2" fill="#2657bf" />
      <rect x="400" y="375" width="45" height="8" rx="2" fill="#2657bf" />
      <rect x="340" y="400" width="120" height="28" rx="4" fill="#162e6a" />
      <rect x="128" y="438" width="24" height="50" rx="4" fill="#1a3a7a" />
      <rect x="468" y="438" width="24" height="50" rx="4" fill="#1a3a7a" />

      {/* ── MONITOR ── */}
      <rect x="258" y="310" width="22" height="28" rx="3" fill="#162e6a" />
      <rect x="230" y="334" width="78" height="10" rx="4" fill="#162e6a" />
      <rect x="168" y="180" width="302" height="145" rx="12" fill="#0f2357" />
      <rect x="180" y="192" width="278" height="122" rx="8" fill="#e8f0fe" />

      {/* Error X on screen */}
      <g style={{ animation: `${pulseX} 2s ease-in-out infinite` }}>
        <circle cx="319" cy="238" r="34" fill="#2756c8" />
        <line x1="305" y1="224" x2="333" y2="252" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <line x1="333" y1="224" x2="305" y2="252" stroke="white" strokeWidth="5" strokeLinecap="round" />
      </g>
      <text x="319" y="286" textAnchor="middle" fontFamily="inherit" fontSize="11" fontWeight="600" fill="#1a3a7a" letterSpacing="1">PAGE NOT FOUND</text>
      <rect x="275" y="290" width="88" height="3" rx="1.5" fill="#93b8f8" opacity=".6" />
      <rect x="290" y="297" width="58" height="3" rx="1.5" fill="#93b8f8" opacity=".4" />

      {/* ── CLIPBOARD ── */}
      <rect x="106" y="198" width="72" height="90" rx="6" fill="#dce8fd" stroke="#93b8f8" strokeWidth="1.5" />
      <rect x="125" y="190" width="34" height="16" rx="3" fill="#93b8f8" />
      <text x="142" y="225" textAnchor="middle" fontFamily="inherit" fontSize="10" fontWeight="700" fill="#1a3a7a">404:</text>
      <text x="142" y="239" textAnchor="middle" fontFamily="inherit" fontSize="9" fontWeight="600" fill="#2657bf">FILE NOT</text>
      <text x="142" y="252" textAnchor="middle" fontFamily="inherit" fontSize="9" fontWeight="600" fill="#2657bf">FOUND</text>

      {/* ── LAMP ── */}
      <line x1="310" y1="20" x2="310" y2="90" stroke="#0f2357" strokeWidth="3" strokeLinecap="round" />
      <path d="M272 90 Q310 108 348 90 L336 125 Q310 135 284 125 Z" fill="#162e6a" />
      <ellipse cx="310" cy="140" rx="28" ry="20" fill="#c5d9fe" opacity=".5" />
      <ellipse cx="310" cy="138" rx="14" ry="10" fill="#e8f2ff" opacity=".9" />
      <line x1="310" y1="155" x2="300" y2="190" stroke="#c5d9fe" strokeWidth="1" opacity=".6" />
      <line x1="310" y1="155" x2="310" y2="195" stroke="#c5d9fe" strokeWidth="1" opacity=".6" />
      <line x1="310" y1="155" x2="320" y2="190" stroke="#c5d9fe" strokeWidth="1" opacity=".6" />

      {/* ── MUG ── */}
      <rect x="188" y="298" width="40" height="38" rx="6" fill="#162e6a" />
      <path d="M228 308 Q248 308 248 318 Q248 328 228 328" stroke="#162e6a" strokeWidth="5" fill="none" strokeLinecap="round" />
      <line x1="198" y1="314" x2="202" y2="314" stroke="#e8f0fe" strokeWidth="2" strokeLinecap="round" />
      <line x1="212" y1="314" x2="216" y2="314" stroke="#e8f0fe" strokeWidth="2" strokeLinecap="round" />
      <path d="M202 322 Q207 319 212 322" stroke="#e8f0fe" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* ZZZ steam */}
      <g style={{ animation: `${zzzAnim} 2.5s ease-in-out infinite` }}>
        <text x="196" y="288" fontFamily="inherit" fontSize="11" fontWeight="700" fill="#3d7ef5">z</text>
        <text x="206" y="278" fontFamily="inherit" fontSize="14" fontWeight="700" fill="#3d7ef5">z</text>
        <text x="218" y="265" fontFamily="inherit" fontSize="17" fontWeight="700" fill="#3d7ef5">Z</text>
      </g>

      {/* ── ROBOT ── */}
      <g style={{ animation: `${bobHead} 3s ease-in-out infinite`, transformOrigin: "446px 296px" }}>
        {/* Body */}
        <rect x="418" y="300" width="56" height="40" rx="6" fill="#162e6a" />
        <rect x="426" y="308" width="40" height="16" rx="3" fill="#1e4494" />
        <circle cx="434" cy="316" r="4" fill="#3d7ef5" />
        <circle cx="448" cy="316" r="4" fill="#93b8f8" />
        <circle cx="462" cy="316" r="4" fill="#3d7ef5" />
        {/* Antenna */}
        <line x1="446" y1="270" x2="446" y2="284" stroke="#1a3a7a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="446" cy="266" r="5" fill="#3d7ef5" />
        {/* Head */}
        <rect x="422" y="282" width="48" height="36" rx="8" fill="#1e4494" />
        <circle cx="436" cy="296" r="6" fill="#e8f0fe" />
        <circle cx="456" cy="296" r="6" fill="#e8f0fe" />
        <circle cx="437" cy="297" r="3" fill="#0f2357" />
        <circle cx="457" cy="297" r="3" fill="#0f2357" />
        <path d="M434 312 Q446 318 458 312" stroke="#93b8f8" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="422" cy="300" r="3" fill="#93b8f8" />
        <circle cx="470" cy="300" r="3" fill="#93b8f8" />
        {/* Question marks */}
        <text x="478" y="278" fontFamily="inherit" fontSize="16" fontWeight="700" fill="#3d7ef5" opacity=".8">?</text>
        <text x="494" y="262" fontFamily="inherit" fontSize="12" fontWeight="700" fill="#93b8f8" opacity=".7">?</text>
        <text x="463" y="260" fontFamily="inherit" fontSize="10" fontWeight="700" fill="#3d7ef5" opacity=".6">?</text>
      </g>

      {/* ── STICKY NOTE ── */}
      <rect x="312" y="295" width="58" height="44" rx="3" fill="#93b8f8" transform="rotate(-4 320 300)" />
      <text x="341" y="314" textAnchor="middle" fontFamily="inherit" fontSize="8" fontWeight="700" fill="#0f2357" transform="rotate(-4 341 314)">I&apos;M</text>
      <text x="341" y="325" textAnchor="middle" fontFamily="inherit" fontSize="8" fontWeight="700" fill="#0f2357" transform="rotate(-4 341 325)">LOST</text>
      <text x="341" y="336" textAnchor="middle" fontFamily="inherit" fontSize="8" fontWeight="700" fill="#0f2357" transform="rotate(-4 341 336)">TOO :(</text>

      {/* ── CLOCK ── */}
      <circle cx="470" cy="155" r="38" fill="white" stroke="#dce8fd" strokeWidth="3" />
      <circle cx="470" cy="155" r="34" fill="#eef3ff" />
      <line x1="470" y1="124" x2="470" y2="130" stroke="#2657bf" strokeWidth="2" strokeLinecap="round" />
      <line x1="501" y1="155" x2="495" y2="155" stroke="#2657bf" strokeWidth="2" strokeLinecap="round" />
      <line x1="470" y1="186" x2="470" y2="180" stroke="#2657bf" strokeWidth="2" strokeLinecap="round" />
      <line x1="439" y1="155" x2="445" y2="155" stroke="#2657bf" strokeWidth="2" strokeLinecap="round" />
      <g style={{ animation: `${spinClock} 4s linear infinite`, transformOrigin: "470px 155px" }}>
        <line x1="470" y1="155" x2="470" y2="132" stroke="#0f2357" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="470" y1="155" x2="490" y2="162" stroke="#2657bf" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="470" cy="155" r="4" fill="#1a3a7a" />

      {/* ── PLANT ── */}
      <ellipse cx="160" cy="468" rx="38" ry="12" fill="#1a3a7a" />
      <rect x="130" y="430" width="60" height="38" rx="8" fill="#162e6a" />
      <rect x="127" y="426" width="66" height="12" rx="4" fill="#1a3a7a" />
      <path d="M158 428 Q130 390 108 360 Q140 380 162 420" fill="#1e4494" />
      <path d="M162 428 Q155 380 170 345 Q188 380 168 428" fill="#2657bf" />
      <path d="M162 428 Q188 385 210 358 Q196 390 164 428" fill="#1e4494" />

      {/* ── BOOKSHELF ── */}
      <rect x="494" y="180" width="80" height="12" rx="2" fill="#162e6a" />
      <rect x="498" y="130" width="14" height="50" rx="2" fill="#2657bf" />
      <rect x="514" y="138" width="12" height="42" rx="2" fill="#1a3a7a" />
      <rect x="528" y="133" width="10" height="47" rx="2" fill="#3d7ef5" />
      <rect x="540" y="140" width="14" height="40" rx="2" fill="#162e6a" />
      <rect x="556" y="135" width="12" height="45" rx="2" fill="#93b8f8" />

      {/* ── TRASH + PAPERS ── */}
      <ellipse cx="320" cy="492" rx="18" ry="10" fill="#dce8fd" />
      <ellipse cx="356" cy="494" rx="14" ry="8" fill="#c5d9fc" />
      <rect x="484" y="440" width="50" height="48" rx="4" fill="#162e6a" />
      <rect x="480" y="434" width="58" height="10" rx="3" fill="#1a3a7a" />
      <line x1="496" y1="452" x2="522" y2="452" stroke="#1e4494" strokeWidth="2" />
      <line x1="496" y1="463" x2="522" y2="463" stroke="#1e4494" strokeWidth="2" />
      <line x1="496" y1="474" x2="522" y2="474" stroke="#1e4494" strokeWidth="2" />

      {/* Floor shadow */}
      <ellipse cx="320" cy="496" rx="210" ry="8" fill="#93b8f8" opacity=".2" />

      {/* Sparkles */}
      <circle cx="142" cy="232" r="3" fill="#3d7ef5" opacity=".5" />
      <circle cx="162" cy="175" r="2" fill="#93b8f8" opacity=".6" />
      <circle cx="500" cy="240" r="4" fill="#3d7ef5" opacity=".4" />
      <circle cx="400" cy="155" r="3" fill="#3d7ef5" opacity=".35" />
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#eef3ff",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 4, md: 2 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background blobs */}
      <Box sx={{ position: "absolute", width: { xs: 220, sm: 320, md: 420 }, height: { xs: 220, sm: 320, md: 420 }, borderRadius: "50%", bgcolor: "#93b8f8", opacity: 0.18, top: { xs: -80, md: -100 }, right: { xs: -60, md: -80 }, pointerEvents: "none" }} />
      <Box sx={{ position: "absolute", width: { xs: 130, md: 260 }, height: { xs: 130, md: 260 }, borderRadius: "50%", bgcolor: "#c5d9fc", opacity: 0.22, bottom: { xs: -40, md: -60 }, left: { xs: -40, md: -60 }, pointerEvents: "none" }} />
      <Box sx={{ position: "absolute", width: { xs: 70, md: 140 }, height: { xs: 70, md: 140 }, borderRadius: "50%", bgcolor: "#3d7ef5", opacity: 0.1, top: "40%", left: "8%", pointerEvents: "none" }} />

      {/* Layout */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          gap: { xs: 4, md: 6 },
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ── LEFT: Text ── */}
        <Box
          sx={{
            flex: 1,
            textAlign: { xs: "center", md: "left" },
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "center", md: "flex-start" },
          }}
        >
          {/* 404 number */}
          <Box sx={{ position: "relative", display: "inline-block", mb: { xs: 1.5, md: 2 } }}>
            <Typography
              component="div"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "88px", sm: "110px", md: "140px" },
                lineHeight: 0.9,
                letterSpacing: "-4px",
                color: "#1a4fd6",
                textShadow: "3px 3px 0 #0f2f8a, 7px 7px 0 rgba(10,30,100,0.13)",
                animation: `${float404} 3s ease-in-out infinite`,
                userSelect: "none",
              }}
            >
              404
            </Typography>

            {/* Spark dots */}
            <Box
              sx={{
                position: "absolute",
                top: 14,
                right: { xs: -14, md: -18 },
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                animation: `${blink} 1.8s ease-in-out infinite`,
              }}
            >
              {[
                { w: 5, h: 5, ml: 0 },
                { w: 4, h: 4, ml: "6px" },
                { w: 6, h: 6, ml: "2px" },
              ].map((s, i) => (
                <Box
                  key={i}
                  sx={{ width: s.w, height: s.h, borderRadius: "50%", bgcolor: "#3d7ef5", ml: s.ml }}
                />
              ))}
            </Box>
          </Box>

          {/* Heading */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "22px", sm: "26px", md: "32px" },
              color: "#091b5c",
              lineHeight: 1.25,
              mb: 1.5,
            }}
          >
            Oops! This page took<br />a wrong turn.
          </Typography>

          {/* Description */}
          <Typography
            sx={{
              fontSize: { xs: "14px", md: "16px" },
              color: "#5a6a9a",
              lineHeight: 1.75,
              mb: { xs: 3, md: 4 },
              maxWidth: 360,
            }}
          >
            Looks like you&apos;ve wandered off the map.
            <br />Let&apos;s get you back on track.
          </Typography>

          {/* Buttons */}
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: { xs: "center", md: "flex-start" } }}>
            <Button
              component={Link}
              href="/dashboard"
              variant="contained"
              size="large"
              startIcon={
                <Box component="svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" sx={{ width: 20, height: 20 }}>
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
                  <path d="M9 21V12h6v9" />
                </Box>
              }
              sx={{
                bgcolor: "#1a4fd6",
                color: "#fff",
                fontWeight: 600,
                fontSize: { xs: "13px", md: "15px" },
                px: { xs: 3, md: 3.5 },
                py: 1.5,
                borderRadius: "50px",
                boxShadow: "0 4px 18px rgba(26,79,214,0.35)",
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#1540b8",
                  boxShadow: "0 8px 28px rgba(26,79,214,0.45)",
                  transform: "translateY(-2px)",
                },
                transition: "all 0.2s",
              }}
            >
              Back to Dashboard
            </Button>

            <Button
              component={Link}
              href="/"
              variant="outlined"
              size="large"
              startIcon={
                <Box component="svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" sx={{ width: 20, height: 20 }}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3 6.4-2.1z" />
                </Box>
              }
              sx={{
                color: "#1a4fd6",
                borderColor: "#93b8f8",
                borderWidth: 2,
                fontWeight: 600,
                fontSize: { xs: "13px", md: "15px" },
                px: { xs: 3, md: 3.5 },
                py: 1.4,
                borderRadius: "50px",
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#e8f0fe",
                  borderColor: "#3d7ef5",
                  borderWidth: 2,
                  transform: "translateY(-2px)",
                },
                transition: "all 0.2s",
              }}
            >
              Go to Homepage
            </Button>
          </Box>

          {/* Decorative mini plane */}
          <Box
            sx={{
              mt: { xs: 3, md: 4 },
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              justifyContent: { xs: "center", md: "flex-start" },
            }}
          >
            <Box component="svg" viewBox="0 0 26 26" fill="none" sx={{ width: 24, height: 24 }}>
              <circle cx="13" cy="13" r="11" stroke="#93b8f8" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="13" cy="13" r="4" fill="#c5d9fc" />
            </Box>
            <Box component="svg" viewBox="0 0 30 22" fill="none" sx={{ width: 28, height: 20, animation: `${glide} 5s ease-in-out infinite` }}>
              <path d="M1 1l28 10L1 21V13l18-2L1 9V1z" fill="#3d7ef5" opacity=".7" />
            </Box>
            <Box component="svg" viewBox="0 0 50 14" sx={{ width: 44, height: 12 }}>
              <path d="M0 7 Q12 0 25 7 Q38 14 50 7" stroke="#93b8f8" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
            </Box>
          </Box>
        </Box>

        {/* ── RIGHT: Illustration ── */}
        <Box
          sx={{
            flex: { xs: "none", md: 1.3 },
            width: { xs: "100%", md: "auto" },
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Illustration />
        </Box>
      </Box>
    </Box>
  );
}
