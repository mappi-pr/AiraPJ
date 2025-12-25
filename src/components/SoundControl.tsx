import React, { useState, useEffect } from 'react';
import './SoundControl.css';
import { useTranslation } from '../hooks/useTranslation';

interface SoundControlProps {
  bgmOn: boolean;
  seOn: boolean;
  onBgmToggle: () => void;
  onSeToggle: () => void;
}

export const SoundControl: React.FC<SoundControlProps> = ({
  bgmOn,
  seOn,
  onBgmToggle,
  onSeToggle,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(70);
  const [seVolume, setSeVolume] = useState(70);

  // Load volumes from localStorage on mount
  useEffect(() => {
    const savedBgmVolume = localStorage.getItem('bgmVolume');
    const savedSeVolume = localStorage.getItem('seVolume');
    
    if (savedBgmVolume) setBgmVolume(parseInt(savedBgmVolume, 10));
    if (savedSeVolume) setSeVolume(parseInt(savedSeVolume, 10));
  }, []);

  // Save volume changes to localStorage
  const handleBgmVolumeChange = (value: number) => {
    setBgmVolume(value);
    localStorage.setItem('bgmVolume', value.toString());
    // Dispatch custom event for BGM volume change
    window.dispatchEvent(new CustomEvent('bgmVolumeChange', { detail: value / 100 }));
    
    // Auto-mute when volume is 0, auto-unmute when volume > 0
    if (value === 0 && bgmOn) {
      onBgmToggle();
    } else if (value > 0 && !bgmOn) {
      onBgmToggle();
    }
  };

  const handleSeVolumeChange = (value: number) => {
    setSeVolume(value);
    localStorage.setItem('seVolume', value.toString());
    
    // Auto-mute when volume is 0, auto-unmute when volume > 0
    if (value === 0 && seOn) {
      onSeToggle();
    } else if (value > 0 && !seOn) {
      onSeToggle();
    }
  };

  // Close panel when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.sound-control')) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isExpanded]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="sound-control">
      <button
        className="sound-control-icon"
        onClick={toggleExpand}
        aria-label={t.soundControl.title}
        title={t.soundControl.title}
      >
        🎵
      </button>

      {isExpanded && (
        <div className="sound-control-panel">
          <div className="sound-control-header">
            <span>{t.soundControl.title}</span>
          </div>

          {/* BGM Control */}
          <div className="sound-control-item">
            <div className="sound-control-label">
              <span>{t.soundControl.bgm}</span>
              <button
                className={`mute-toggle ${bgmOn ? 'on' : 'off'}`}
                onClick={onBgmToggle}
                title={bgmOn ? t.soundControl.mute : t.soundControl.unmute}
              >
                {bgmOn ? '🔊' : '🔇'}
              </button>
            </div>
            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="100"
                value={bgmVolume}
                onChange={(e) => handleBgmVolumeChange(parseInt(e.target.value, 10))}
                disabled={!bgmOn}
              />
            </div>
          </div>

          {/* SE Control */}
          <div className="sound-control-item">
            <div className="sound-control-label">
              <span>{t.soundControl.se}</span>
              <button
                className={`mute-toggle ${seOn ? 'on' : 'off'}`}
                onClick={onSeToggle}
                title={seOn ? t.soundControl.mute : t.soundControl.unmute}
              >
                {seOn ? '🔊' : '🔇'}
              </button>
            </div>
            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="100"
                value={seVolume}
                onChange={(e) => handleSeVolumeChange(parseInt(e.target.value, 10))}
                disabled={!seOn}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
