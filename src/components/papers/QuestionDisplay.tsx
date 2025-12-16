/**
 * QuestionDisplay component for showing question images with dark mode toggle
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import type { Question } from "@/types/papers";

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  className?: string;
  remainingTime?: number;
  totalTimeMinutes?: number;
  isGuessed?: boolean;
  onGuessToggle?: () => void;
  paperName?: string;
  currentQuestion?: Question;
}

export function QuestionDisplay({ 
  question, 
  questionNumber, 
  className, 
  remainingTime = 0,
  totalTimeMinutes = 60, 
  isGuessed = false, 
  onGuessToggle, 
  paperName = "",
  currentQuestion 
}: QuestionDisplayProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  // Discrete clock display values (update once per second/minute)
  const [displaySeconds, setDisplaySeconds] = useState(Math.floor(remainingTime % 60));
  const [displayMinutes, setDisplayMinutes] = useState(Math.floor(remainingTime / 60));
  const prevMinuteRef = useRef(displayMinutes);

  // Update the discrete display values based on remainingTime
  useEffect(() => {
    const secs = Math.floor(remainingTime % 60);
    const mins = Math.floor(remainingTime / 60);
    setDisplaySeconds(secs);
    if (mins !== prevMinuteRef.current) {
      setDisplayMinutes(mins);
      prevMinuteRef.current = mins;
    }
  }, [remainingTime]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Reset zoom and pan when entering/exiting fullscreen
    if (!isFullscreen) {
      setZoom(1.0);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!isFullscreen) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(5.0, zoom + delta));
    setZoom(newZoom);
    
    // Reset pan when zooming out to fit
    if (newZoom <= 1.0) {
      setPanPosition({ x: 0, y: 0 });
    }
  };

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFullscreen || zoom <= 1.0) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isFullscreen || zoom <= 1.0) return;
    
    e.preventDefault();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPanPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Check if content is scrollable
  const checkScrollable = () => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      setShowScrollIndicator(scrollHeight > clientHeight);
    }
  };

  // Check scrollability when image loads
  useEffect(() => {
    if (!imageLoading) {
      setTimeout(checkScrollable, 100); // Small delay to ensure layout is complete
    }
  }, [imageLoading]);

  // Prevent context menu on image
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className={cn("relative h-full", className)}>
      {imageLoading && (
        <div className="flex items-center justify-center h-64 bg-white/5 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-white/60">Loading question...</p>
          </div>
        </div>
      )}
      
      {imageError && (
        <div className="flex items-center justify-center h-64 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 text-red-400 mx-auto">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-red-400">Failed to load question image</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setImageError(false);
                setImageLoading(true);
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {!imageError && (
        <>
          {/* Regular View */}
          {!isFullscreen && (
            <div className="relative h-full">
              {/* Wrapper container with fixed height and border */}
              <div 
                className="relative rounded-lg h-full"
                style={{
                  width: '100%',
                  // Height is controlled by parent container - remove fixed vh value
                }}
              >
                {/* Scrollable container for image content */}
                <div 
                  ref={scrollContainerRef}
                  className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide transition-colors duration-300 ease-in-out"
                  style={{
                    backgroundColor: isDarkMode ? '#000000' : '#ffffff' // Match the exact image background colors
                  }}
                >
                  <div className="flex flex-col items-center justify-center min-h-full pt-12 pb-12 px-8">
                    <div
                      className="relative flex w-full justify-center"
                      style={{ isolation: 'isolate' }}
                    >
                      <div
                        className="relative inline-block"
                        style={{
                          width: 'min(72%, 1100px)',
                          maxWidth: '1100px',
                          lineHeight: 0,
                          transition: 'background-color 300ms ease-in-out'
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            display: 'inline-block',
                            lineHeight: 0,
                            backgroundColor: isDarkMode ? '#ffffff' : 'transparent'
                          }}
                        >
                          <img
                            src={question.questionImage}
                            alt={`Question ${questionNumber}`}
                            className={cn(
                              "block h-auto w-full transition-opacity duration-300 ease-in-out",
                              imageLoading ? "opacity-0" : "opacity-100",
                              isDarkMode && "mix-blend-difference"
                            )}
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                            style={{
                              display: 'block',
                              height: 'auto',
                              width: '100%',
                              imageRendering: 'auto',
                              borderRadius: 0,
                              margin: 0,
                              padding: 0,
                              verticalAlign: 'bottom'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Pills below image */}
                    <div className="flex items-center gap-3 mt-8 flex-wrap justify-center">
                      {paperName && (
                        <div className={`px-2 py-1 text-xs rounded-md border backdrop-blur-sm ${isDarkMode ? 'bg-black/50 text-neutral-400 border-white/20' : 'bg-white/80 text-neutral-600 border-neutral-300'}`}>
                          {paperName}
                        </div>
                      )}
                      <div className={`px-2 py-1 text-xs rounded-md border backdrop-blur-sm ${isDarkMode ? 'bg-black/50 text-neutral-400 border-white/20' : 'bg-white/80 text-neutral-600 border-neutral-300'}`}>
                        {new Date().toLocaleDateString()}
                      </div>
                      {currentQuestion && (
                        <>
                          <div className={`px-2 py-1 text-xs rounded-md border backdrop-blur-sm ${isDarkMode ? 'bg-black/50 text-neutral-400 border-white/20' : 'bg-white/80 text-neutral-600 border-neutral-300'}`}>
                            {currentQuestion.partName}
                          </div>
                          <div className={`px-2 py-1 text-xs rounded-md border backdrop-blur-sm ${isDarkMode ? 'bg-black/50 text-neutral-400 border-white/20' : 'bg-white/80 text-neutral-600 border-neutral-300'}`}>
                            {currentQuestion.examType}
                          </div>
                          {currentQuestion.solutionType !== 'none' && (
                            <div className={`px-2 py-1 text-xs rounded-md border backdrop-blur-sm ${isDarkMode ? 'bg-black/50 text-neutral-400 border-white/20' : 'bg-white/80 text-neutral-600 border-neutral-300'}`}>
                              {currentQuestion.solutionType === 'official' ? 'Has Solution' : 'Has Solution'}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scroll indicator - subtle fade at bottom when scrollable */}
                {showScrollIndicator && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-40" />
                )}

                {/* Fixed overlay for buttons - positioned as sibling of scrollable container */}
                <div className="absolute inset-0 pointer-events-none z-50">
                  {/* Top Bar: Question Number and Mark-as-Guess (Left), Timer (Right) */}
                  <div className="absolute top-6 left-6 pointer-events-auto">
                    <div className="flex flex-col items-start gap-1">
                      <div className={`text-lg font-bold px-3 py-1 rounded-lg backdrop-blur-sm ${isDarkMode ? 'text-neutral-100 bg-black/50' : 'text-neutral-800 bg-white/80'}`}>
                        Question {questionNumber}
                      </div>
                      {onGuessToggle && (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg backdrop-blur-sm ${isDarkMode ? 'bg-black/50' : 'bg-white/80'}`}>
                          <label className={`text-xs font-semibold uppercase tracking-wider ${isGuessed ? 'text-yellow-600' : isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                            Mark as Guess
                          </label>
                          <button
                            onClick={onGuessToggle}
                            className={`
                              relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-transparent
                              ${isGuessed 
                                ? 'bg-yellow-500' 
                                : 'bg-neutral-600'
                              }
                            `}
                          >
                            <span
                              className={`
                                inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                                ${isGuessed ? 'translate-x-5' : 'translate-x-1'}
                              `}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timer - Top Right (aligned with top bar) */}
                  <div className="absolute top-6 right-6 pointer-events-auto">
                    <div className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg backdrop-blur-sm ${isDarkMode ? 'bg-black/50' : 'bg-white/80'}`}>
                      <svg className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        {/* Minute hand - rotates 360 degrees every 60 minutes (updates only when minute changes) clockwise */}
                        {(() => {
                          // Calculate based on remaining minutes to show position on clock face
                          // Convert remaining minutes to clock position (0-60 minutes = 0-360 degrees)
                          // Clockwise rotation: as time decreases, hand moves clockwise from 12 o'clock
                          const remainingMinutePortion = displayMinutes % 60;
                          const minuteRotation = ((60 - remainingMinutePortion) / 60) * 360;
                          return (
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2.5" 
                              d="M12 12 L12 8" 
                              style={{
                                transformOrigin: '12px 12px',
                                transform: `rotate(${minuteRotation}deg)`,
                                transition: 'transform 0.5s linear'
                              }}
                            />
                          );
                        })()}
                        {/* Second hand - rotates 3 full revolutions per minute (0.2s jerk) clockwise */}
                        {(() => {
                          // Calculate based on elapsed seconds to rotate clockwise
                          // 3 revolutions per 60 seconds = 1080 degrees per 60 seconds
                          // At 60 seconds remaining: 0 degrees (top), at 0 seconds: 1080 degrees (3 full rotations)
                          const secondRotation = ((60 - displaySeconds) / 60) * 1080;
                          return (
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2.5" 
                              d="M12 12 L12 6" 
                              style={{
                                transformOrigin: '12px 12px',
                                transform: `rotate(${secondRotation}deg)`,
                                transition: 'transform 0.2s ease-out'
                              }}
                            />
                          );
                        })()}
                        {/* Center dot for clean intersection */}
                        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                      </svg>
                      <span className={`text-lg font-bold tabular-nums leading-none ${isDarkMode ? 'text-neutral-100' : 'text-neutral-800'}`}>
                        {Math.floor(remainingTime / 60).toString().padStart(2, '0')}:{(remainingTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Fullscreen Button - Bottom Left */}
                  <div className="absolute bottom-8 left-8 pointer-events-auto" style={{ bottom: '32px' }}>
                    <button
                      onClick={toggleFullscreen}
                      className="
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200
                        backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25
                      "
                      title="Enter fullscreen mode"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span className="hidden sm:inline">Fullscreen</span>
                    </button>
                  </div>

                  {/* Dark Mode Toggle - Bottom Right */}
                  <div className="absolute bottom-8 right-8 pointer-events-auto" style={{ bottom: '32px' }}>
                    <button
                      onClick={toggleDarkMode}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200
                        backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25
                      `}
                      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                    >
                      {isDarkMode ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span className="hidden sm:inline">Light</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          <span className="hidden sm:inline">Dark</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen View - Using Portal */}
          {isFullscreen && createPortal(
            <div 
              className="fixed inset-0 z-[99999] bg-black"
              onWheel={handleWheel}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Image Container with Zoom and Pan */}
              <div 
                ref={containerRef}
                className="relative w-full h-full flex items-center justify-center p-8"
              >
                <div
                  className={cn(
                    "relative inline-block select-none transition-transform duration-200 ease-out",
                    zoom > 1.0 ? "cursor-grab" : "cursor-default",
                    isDragging ? "cursor-grabbing" : ""
                  )}
                  onMouseDown={handleMouseDown}
                  style={{
                    lineHeight: 0,
                    transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
                    transformOrigin: 'center center',
                    transition: 'background-color 200ms ease-out'
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      lineHeight: 0,
                      backgroundColor: isDarkMode ? '#ffffff' : 'transparent'
                    }}
                  >
                    <img
                      src={question.questionImage}
                      alt={`Question ${questionNumber}`}
                      className={cn(
                        "block h-auto w-auto transition-opacity duration-200 ease-out",
                        imageLoading ? "opacity-0" : "opacity-100",
                        isDarkMode && "mix-blend-difference"
                      )}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      onContextMenu={handleContextMenu}
                      style={{
                        maxWidth: 'calc(100vw - 4rem)',
                        maxHeight: 'calc(100vh - 4rem)',
                        objectFit: 'contain',
                        borderRadius: 0,
                        margin: 0,
                        padding: 0,
                        display: 'block',
                        verticalAlign: 'bottom'
                      }}
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Exit Fullscreen Button - Top Right */}
                <button
                  onClick={toggleFullscreen}
                  className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border shadow-lg bg-black/90 border-white/30 text-white hover:bg-black/95 z-10"
                  title="Exit fullscreen mode"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Fullscreen
                </button>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}