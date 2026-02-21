import { useState, useRef } from "react";

interface Props { audioUrl: string; summary: string }

export default function AudioPlayer({ audioUrl, summary }: Props) {
  const [playing, setPlaying] = useState(false);
  const [useSpeech, setUseSpeech] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    // Try real audio file first
    if (!useSpeech && audioUrl && audioUrl !== "/audio/demo-audio.mp3") {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setPlaying(false);
      }
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play().catch(() => {
          // Fallback to browser speech
          setUseSpeech(true);
          speakSummary();
        });
        setPlaying(true);
      }
    } else {
      // Use browser Web Speech API as fallback
      speakSummary();
    }
  };

  const speakSummary = () => {
    if ("speechSynthesis" in window) {
      if (playing) {
        window.speechSynthesis.cancel();
        setPlaying(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onend = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
      setPlaying(true);
    }
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-2 h-2 rounded-full ${playing ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Executive Audio Summary
        </p>
      </div>

      <p className="text-sm text-gray-300 mb-4 leading-relaxed">{summary}</p>

      <button
        onClick={togglePlay}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          playing
            ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
        }`}
      >
        <span>{playing ? "⏹ Stop" : "▶ Play Executive Briefing"}</span>
      </button>
    </div>
  );
}