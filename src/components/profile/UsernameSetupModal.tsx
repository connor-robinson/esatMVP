/**
 * Username Setup Modal - Blocks users until they set a username
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface UsernameSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  blocking?: boolean; // If true, prevents dismissal and blocks site access
}

export function UsernameSetupModal({ isOpen, onComplete, blocking = false }: UsernameSetupModalProps) {
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{
    available: boolean | null;
    message: string | null;
  }>({ available: null, message: null });

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username.trim().length === 0) {
      setAvailability({ available: null, message: null });
      setError(null);
      return;
    }

    // Validate format first
    const usernameRegex = /^[a-zA-Z0-9_-]{2,20}$/;
    if (!usernameRegex.test(username)) {
      setAvailability({
        available: false,
        message: 'Username must be 2-20 characters and contain only letters, numbers, underscores, or hyphens'
      });
      setError(null);
      return;
    }

    // Debounce the API call
    const timeoutId = setTimeout(async () => {
      setChecking(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/profile/username/check?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        if (response.ok) {
          setAvailability({
            available: data.available,
            message: data.message
          });
        } else {
          setError(data.error || 'Failed to check username');
          setAvailability({ available: null, message: null });
        }
      } catch (err) {
        setError('Failed to check username availability');
        setAvailability({ available: null, message: null });
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || username.trim().length === 0) {
      setError('Please enter a username');
      return;
    }

    if (availability.available !== true) {
      setError('Please choose an available username');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save username');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save username');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      blocking ? "bg-black/80 backdrop-blur-md" : "bg-black/60 backdrop-blur-sm"
    )}>
      <Card className="w-full max-w-md p-8 m-4 bg-white/5 border border-white/10">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white/90 mb-2">Choose Your Username</h2>
            <p className="text-sm text-white/60">
              {blocking 
                ? "You need to set a username before you can continue. This will be your unique identifier on the platform."
                : "You need to set a username before you can continue. This will be your unique identifier on the platform."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">Username</label>
              <div className="relative">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className={cn(
                    "w-full pr-10 bg-white/5 border-white/10 text-white/90",
                    availability.available === true && "border-success",
                    availability.available === false && "border-error",
                    error && "border-error"
                  )}
                  autoFocus
                  disabled={saving}
                  autoComplete="username"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking && (
                    <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                  )}
                  {!checking && availability.available === true && (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                  {!checking && availability.available === false && (
                    <AlertCircle className="w-4 h-4 text-error" />
                  )}
                </div>
              </div>
              
              {availability.message && (
                <p className={cn(
                  "text-xs",
                  availability.available === true ? "text-success" : "text-error"
                )}>
                  {availability.message}
                </p>
              )}
              
              {error && (
                <p className="text-xs text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              )}
              
              <p className="text-xs text-white/40 mt-2">
                2-20 characters. Letters, numbers, underscores, and hyphens only.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={saving || availability.available !== true || checking}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

