import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function VoiceBar({ compact = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const barRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (!compact) {
      gsap.fromTo(barRef.current, 
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'expo.out', delay: 0.5 }
      );
    } else {
      gsap.fromTo(barRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [compact]);

  const handleSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    // Navigate to shop page with query
    navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const transcribeRecording = async (recording) => {
    const formData = new FormData();
    formData.append('audio', recording, 'autocart-recording.webm');
    const response = await fetch('http://127.0.0.1:8000/api/transcribe-audio/', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Transcription failed.');
    const text = String(result.text || '').trim();
    if (!text) throw new Error('No speech was detected.');
    setTranscript(text);
    setQuery(text);
    handleSearch(text);
  };

  const toggleListen = async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaStreamRef.current = stream;
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        recorder.onstop = async () => {
          const recording = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          setIsListening(false);
          if (recording.size > 0) {
            try {
              await transcribeRecording(recording);
            } catch (error) {
              console.error(error);
              alert(error instanceof Error ? error.message : 'Could not transcribe the recording.');
            }
          }
        };
        recorder.start();
        setTranscript('Recording...');
        setIsListening(true);
      } catch (error) {
        console.error(error);
        alert('Microphone access was denied or is unavailable.');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const searchQuery = query.trim() || transcript.trim();
    if (searchQuery) handleSearch(searchQuery);
    else navigate('/shop');
  };

  return (
    <div className={cn("voice-bar-section", compact && "compact")} ref={barRef} style={{ padding: 0, background: 'transparent' }}>
      <motion.form 
        className={cn("voice-bar-container")} 
        onSubmit={handleSubmit}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          className="voice-btn"
          onClick={() => navigate('/vision')}
          style={{ marginRight: '8px' }}
          title="Visual Search"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </button>
        <button 
          type="button" 
          className={cn("voice-btn", isListening && "recording")} 
          onClick={toggleListen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
        
        <div className="input-wrap" style={{ flex: 1 }}>
          {isListening ? (
            <div className={cn("voice-input")}>{transcript || 'Listening...'}</div>
          ) : (
            <input 
              type="text" 
              className={cn("voice-input")}
              placeholder="Ask AutoCart to find something..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          )}
        </div>

        <button
          type="submit"
          className={cn("search-btn")}
          aria-label="Search AutoCart"
          title="Search"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </motion.form>
    </div>
  );
}
