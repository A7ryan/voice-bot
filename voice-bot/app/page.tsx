'use client';

import { useState, useRef, useEffect } from 'react';

// TypeScript interfaces for Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function VoiceBotPage() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();

        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setError('');
        };

        recognitionRef.current.onresult = async (event: SpeechRecognitionEvent) => {
          const speechResult = event.results[0][0].transcript;
          setTranscript(speechResult);
          console.log('You said:', speechResult);
          await handleAIResponse(speechResult);
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setError('Speech recognition not supported in this browser');
      }

      // Initialize Speech Synthesis
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      } else {
        setError('Speech synthesis not supported in this browser');
      }
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        setError('Error starting speech recognition');
        console.error('Speech recognition error:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  // AI Response Handler
  const handleAIResponse = async (message: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: message }] }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const reply = data.reply || 'Sorry, I could not get a response.';
      setAiResponse(reply);
      console.log('AI Response:', reply);
      await speakText(reply);
    } catch (error) {
      console.error('AI response error:', error);
      const fallbackResponse = `I heard you say: "${message}". There was an error connecting to the AI service.`;
      setAiResponse(fallbackResponse);
      await speakText(fallbackResponse);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (synthRef.current && text) {
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => { setIsSpeaking(false); resolve(); };
        utterance.onerror = () => { setIsSpeaking(false); resolve(); };

        synthRef.current.speak(utterance);
      } else {
        resolve();
      }
    });
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    setTranscript('');
    setAiResponse('');
    setError('');
    stopSpeaking();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Voice Bot 🎤🤖
        </h1>

        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          <button
            onClick={startListening}
            disabled={isListening || isProcessing}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              isListening || isProcessing
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isListening ? '🎤 Listening...' : '🎤 Start Listening'}
          </button>

          <button
            onClick={stopListening}
            disabled={!isListening}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              !isListening
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            ⏹️ Stop Listening
          </button>

          <button
            onClick={stopSpeaking}
            disabled={!isSpeaking}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              !isSpeaking
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            🔇 Stop Speaking
          </button>
        </div>

        <div className="flex justify-center gap-4 mb-4 flex-wrap">
          {isListening && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm animate-pulse">
              🎤 Listening for your voice...
            </span>
          )}
          {isProcessing && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm animate-pulse">
              🤖 AI is thinking...
            </span>
          )}
          {isSpeaking && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm animate-pulse">
              🔊 AI is speaking...
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        <div className="space-y-4">
          {transcript && (
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h3 className="font-semibold text-blue-800 mb-2">👤 You said:</h3>
              <p className="text-gray-700">{transcript}</p>
            </div>
          )}

          {aiResponse && (
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
              <h3 className="font-semibold text-green-800 mb-2">🤖 AI Response:</h3>
              <p className="text-gray-700">{aiResponse}</p>
            </div>
          )}
        </div>

        {(transcript || aiResponse) && (
          <div className="mt-6 text-center">
            <button
              onClick={clearConversation}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              🗑️ Clear Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
