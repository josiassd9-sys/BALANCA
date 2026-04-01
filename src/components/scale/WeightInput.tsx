"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatNumber } from "./format-number";

interface WeightInputProps {
  inputId?: string;
  value: number;
  onChange: (value: string) => void;
  onFetch: () => boolean;
  onFocusInput?: () => void;
  hasPendingCopiedWeight?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function WeightInput({
  inputId,
  value,
  onChange,
  onFetch,
  onFocusInput,
  hasPendingCopiedWeight = false,
  placeholder,
  className,
  disabled = false,
}: WeightInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showFetchedBadge, setShowFetchedBadge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const fetchedBadgeTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);
  const skipNextFocusCallback = useRef(false);
  const pointerFocusInProgress = useRef(false);

  const showFetchedFromDisplayBadge = () => {
    if (fetchedBadgeTimer.current) {
      clearTimeout(fetchedBadgeTimer.current);
    }

    setShowFetchedBadge(true);
    fetchedBadgeTimer.current = setTimeout(() => {
      setShowFetchedBadge(false);
      fetchedBadgeTimer.current = null;
    }, 1800);
  };

  const ensureMobileVisibility = () => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    inputRef.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  };

  const handlePointerDown = () => {
    if (disabled) return;
    pointerFocusInProgress.current = true;
    longPressTriggered.current = false;
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }, 500);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    window.setTimeout(() => {
      pointerFocusInProgress.current = false;
    }, 0);
  };

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pointerFocusInProgress.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;

    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      e.preventDefault();
      return;
    }

    if (hasPendingCopiedWeight) {
      e.preventDefault();

      // Always prioritize auto-paste when there is pending copied weight,
      // even if this input is already focused/editing.
      if (!isEditing) {
        setIsEditing(true);
        skipNextFocusCallback.current = true;
      }

      ensureMobileVisibility();
      onFocusInput?.();
      return;
    }

    // Single tap/click always prioritizes fetching live weight from the display.
    e.preventDefault();
    const didFetch = onFetch();

    if (didFetch) {
      showFetchedFromDisplayBadge();
    }

    if (!didFetch) {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      clearPressTimer();

      if (fetchedBadgeTimer.current) {
        clearTimeout(fetchedBadgeTimer.current);
        fetchedBadgeTimer.current = null;
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        id={inputId}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        placeholder={placeholder || "0"}
        value={isEditing ? value || "" : formatNumber(value)}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (disabled) return;
          ensureMobileVisibility();

          if (skipNextFocusCallback.current) {
            skipNextFocusCallback.current = false;
            return;
          }

          onFocusInput?.();

          // If focus came from touch/click, let onClick decide between fetch and edit.
          if (pointerFocusInProgress.current) {
            return;
          }

          setIsEditing(true);
        }}
        onBlur={() => {
          pointerFocusInProgress.current = false;
          setIsEditing(false);
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearPressTimer}
        onPointerLeave={clearPressTimer}
        onClick={handleClick}
        disabled={disabled}
        className={cn("text-right h-8 print:hidden w-full", {
          "cursor-pointer": !isEditing && !disabled,
          "pr-14": showFetchedBadge,
        })}
      />
      <span
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 transition-opacity duration-200 print:hidden pointer-events-none",
          showFetchedBadge ? "opacity-100" : "opacity-0",
        )}
      >
        visor
      </span>
      <span className="hidden print:block text-right print:text-black">{formatNumber(value)}</span>
    </div>
  );
}
