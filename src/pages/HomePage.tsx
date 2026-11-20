import { useState } from "react";
import { createPortal } from "react-dom";
import { InlineAlert } from "../components/ui/InlineAlert";
import { useMusicVisualizer } from "../hooks/useMusicVisualizer";

function BetaNoticeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ zIndex: 9999 }}
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm">
        <InlineAlert variant="info" title="베타 테스트 안내">
          <div className="space-y-1 text-white/90">
            <p>
              • 현재 베타 테스트 단계이며, 시스템 상황에 따라 테스트 기간이 연장될 수 있습니다. (2026.03.15 ~ 2026.04.15)
            </p>
            <p>
              • 토러스에 대한 애정으로 1인 개발한 시스템이니 너그러운 마음으로 이용해 주시면 감사하겠습니다.
            </p>
            <p>
              • 시스템 관련 피드백 및 버그 제보는 아래 오픈 채팅방으로 문의 주시면 감사하겠습니다.
            </p>
            <p>
              <a
                href="https://open.kakao.com/o/suXRhsli"
                className="text-blue-400 underline break-all"
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
              >
                https://open.kakao.com/o/suXRhsli
              </a>
            </p>
          </div>
          <button
            type="button"
            className="mt-4 w-full py-2 rounded-lg bg-status-info/20 border border-status-info/30 text-status-info text-sm font-semibold hover:bg-status-info/30 transition-colors cursor-pointer"
            onClick={onClose}
          >
            확인
          </button>
        </InlineAlert>
      </div>
    </div>,
    document.body
  );
}

export function HomePage() {
  const {
    canvasRef,
    audioRef,
    isPlaying,
    togglePlayback,
    audioProgress,
    isLoading,
  } = useMusicVisualizer();
  const [noticeOpen, setNoticeOpen] = useState(false);

  return (
    <div className="music-reactive-hero">
      <BetaNoticeModal isOpen={noticeOpen} onClose={() => setNoticeOpen(false)} />
      <canvas ref={canvasRef} className="visualization-canvas" />
      <div className="hero-content">
        <p className="hero-tagline">free souls dwelling within the music</p>
        <h1 className="hero-title">
          <span className="title-line">WE ARE</span>
          <span className="title-line">TAURUS</span>
        </h1>
        <p className="hero-subtitle">Jeonbuk National University Band Club</p>
        <p className="hero-credit">Since 1987</p>
      </div>

      <button
        type="button"
        className={`play-button ${!isPlaying && !isLoading ? "pulse-animation" : ""}`}
        onClick={togglePlayback}
        disabled={isLoading}
      >
        {isLoading ? "LOADING..." : isPlaying ? "STOP" : "PLAY"}
      </button>

      <div className="audio-progress">
        <div className="progress-bar" style={{ width: `${audioProgress}%` }} />
      </div>

      <div className="bottom-info">
        <img
          src={`${import.meta.env.BASE_URL}images/fucking-taurus.png`}
          alt="Album Cover"
          className="album-img"
        />
        <div className="song-details">
          <span className="song-info">TAURUS - TAURUS</span>
          <span className="artists">
            BY 김영훈, 정기훈, 김두태, 김성민, 하경덕, 김도윤
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/TAURUS-TAURUS.mp3`}
        crossOrigin="anonymous"
        preload="auto"
      />
    </div>
  );
}
