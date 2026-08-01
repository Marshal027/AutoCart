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
  const recognitionRef = useRef(null);

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

  const toggleListen = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition.");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
    };
    
    recognition.onerror = (e) => {
      console.error(e);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      if (transcript) {
        handleSearch(transcript);
      }
    };
    
    recognition.start();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query) {
      handleSearch(query);
    }
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
              placeholder="Ask Trigr to find something..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          )}
        </div>

        {(query || transcript) && (
          <button type="submit" className={cn("search-btn")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        )}
      </motion.form>
    </div>
  );
}
