import { useState, useEffect, useCallback, useRef } from "react";

interface SelectionPosition {
  x: number;
  y: number;
}

interface UseTextSelectionProps {
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  minSelectionLength?: number;
}

export function useTextSelection({
  containerRef,
  enabled = true,
  minSelectionLength = 3,
}: UseTextSelectionProps) {
  const [selectedText, setSelectedText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<SelectionPosition>({ x: 0, y: 0 });
  const selectionTimeoutRef = useRef<NodeJS.Timeout>();

  const calculatePopupPosition = useCallback((selection: Selection): SelectionPosition => {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate center position of selection relative to viewport
    let x = rect.left + rect.width / 2;
    let y = rect.top;

    // Ensure popup stays within viewport bounds
    const popupWidth = 350; // Approximate popup width
    const popupHeight = 150; // Approximate popup height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position if needed (keep in viewport)
    if (x - popupWidth / 2 < 10) {
      x = popupWidth / 2 + 10;
    } else if (x + popupWidth / 2 > viewportWidth - 10) {
      x = viewportWidth - popupWidth / 2 - 10;
    }

    // Adjust vertical position if needed
    // If there's not enough space above, show below the selection
    if (y - popupHeight - 20 < 10) {
      y = rect.bottom + 10;
    } else {
      y = y - 10; // Show above the selection with small gap
    }

    // Make sure popup doesn't go below viewport
    if (y + popupHeight > viewportHeight - 10) {
      y = Math.max(10, viewportHeight - popupHeight - 10);
    }

    return { x, y };
  }, []);

  const handleSelectionChange = useCallback(() => {
    if (!enabled || !containerRef.current) return;

    // Clear any existing timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    // Small delay to ensure selection is complete
    selectionTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) {
        setIsVisible(false);
        setSelectedText("");
        return;
      }

      const selectedText = selection.toString().trim();
      console.log("🎯 Text selection hook - selected text:", selectedText);
      console.log("🎯 Text selection hook - text length:", selectedText.length);
      
      // Check if selection is COMPLETELY within our container
      const range = selection.getRangeAt(0);
      
      if (!containerRef.current) {
        setIsVisible(false);
        setSelectedText("");
        return;
      }

      // More strict container checking - both start and end must be within container
      const startWithinContainer = containerRef.current.contains(range.startContainer);
      const endWithinContainer = containerRef.current.contains(range.endContainer);
      
      // Additional check: make sure the common ancestor is also within our container
      const commonAncestorWithinContainer = containerRef.current.contains(range.commonAncestorContainer);
      
      const isCompletelyWithinContainer = startWithinContainer && 
                                         endWithinContainer && 
                                         commonAncestorWithinContainer;

      if (!isCompletelyWithinContainer || selectedText.length < minSelectionLength) {
        setIsVisible(false);
        setSelectedText("");
        return;
      }

      // Calculate position and show popup
      const position = calculatePopupPosition(selection);
      console.log("🎯 Text selection hook - setting selected text:", selectedText);
      console.log("🎯 Text selection hook - showing popup at position:", position);
      setSelectedText(selectedText);
      setPosition(position);
      setIsVisible(true);
    }, 100);
  }, [enabled, containerRef, minSelectionLength, calculatePopupPosition]);

  const clearSelection = useCallback(() => {
    setIsVisible(false);
    setSelectedText("");
    
    // Clear the actual text selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  const handleResize = useCallback(() => {
    if (isVisible) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const newPosition = calculatePopupPosition(selection);
        setPosition(newPosition);
      }
    }
  }, [isVisible, calculatePopupPosition]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("selectionchange", handleSelectionChange);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
      
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [enabled, handleSelectionChange, handleResize]);

  // Clear selection when container changes or component unmounts
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  return {
    selectedText,
    isVisible,
    position,
    clearSelection,
  };
}
