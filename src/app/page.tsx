"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Box, Input, Flex, Text, Link } from "@chakra-ui/react";

interface Suggestion {
  label?: string;
  searchName?: string;
  antecedent?: string;
  category?: number;
  type?: string;
  post_count?: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [currentInputText, setCurrentInputText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionText, setSuggestionText] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseHTMLSuggestions = useCallback((html: string): Suggestion[] => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = doc.querySelectorAll("li.ui-menu-item");
    return Array.from(items).map((item) => {
      const value = item.getAttribute("data-autocomplete-value") || undefined;
      const postCount = item.querySelector(".post-count");
      const tagClass = item.querySelector("a")?.classList.item(0);
      const antecedent = item.querySelector(".autocomplete-antecedent span:nth-child(2)");
      return {
        label: value,
        searchName: value,
        type: item.getAttribute("data-autocomplete-type") || undefined,
        post_count: postCount?.textContent?.trim(),
        category: tagClass ? parseInt(tagClass.split("-").pop() || "0", 10) : 0,
        antecedent: antecedent?.textContent?.trim(),
      };
    });
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      setSuggestionText("");
      return;
    }
    const controller = new AbortController();
    fetch(
        `https://danbooru.donmai.us/autocomplete?search%5Bquery%5D=${encodeURIComponent(query)}&search%5Btype%5D=tag_query&version=1&limit=20`,
        { signal: controller.signal }
    )
        .then((res) => res.ok ? res.text() : Promise.reject(`HTTP error! status: ${res.status}`))
        .then((html) => {
          const parsedSuggestions = parseHTMLSuggestions(html);
          setSuggestions(parsedSuggestions);
          if (parsedSuggestions.length > 0 && parsedSuggestions[0].label?.startsWith(query)) {
            setSuggestionText(parsedSuggestions[0].label.substring(query.length) || "");
          } else {
            setSuggestionText("");
          }
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          console.error(err);
          setSuggestionText("");
        });
    return () => controller.abort();
  }, [query, parseHTMLSuggestions]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current?.children[activeIndex]) {
      listRef.current.children[activeIndex].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeIndex]);

  const updateInputValue = useCallback((selectedSuggestion: string) => {
    const inputValue = currentInputText;
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const lastCommaIndex = inputValue.lastIndexOf(',', cursorPosition - 1);
    const updatedValue = lastCommaIndex !== -1
        ? inputValue.substring(0, lastCommaIndex + 1) + " " + selectedSuggestion + inputValue.substring(cursorPosition)
        : selectedSuggestion + inputValue.substring(cursorPosition);

    setCurrentInputText(updatedValue);
    setQuery("");
    setSuggestions([]);
    setActiveIndex(-1);
    setSuggestionText("");
  }, [currentInputText]);


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions.length > 0) {
        updateInputValue(suggestions[0].searchName || suggestions[0].label || "");
      }
    }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        updateInputValue(suggestions[activeIndex].searchName || suggestions[activeIndex].label || "");
      } else if (suggestions.length > 0) {
        updateInputValue(suggestions[0].searchName || suggestions[0].label || "");
      }
    }
    else if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
      setSuggestionText("");
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = useCallback((item: Suggestion) => {
    updateInputValue(item.searchName || item.label || "");
  }, [updateInputValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setCurrentInputText(inputValue);
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const lastCommaIndex = inputValue.lastIndexOf(',', cursorPosition - 1);
    const currentQuery = lastCommaIndex !== -1
        ? inputValue.substring(lastCommaIndex + 1, cursorPosition).trim()
        : inputValue.substring(0, cursorPosition).trim();

    setQuery(currentQuery);
    setActiveIndex(-1);
    setSuggestionText("");
  }, []);


  return (
      <Box width="400px" mx="auto" mt="50px" position="relative">
        <Box position="relative">
          <Input
              ref={inputRef}
              type="text"
              value={currentInputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Cari tag..."
              size="md"
              borderRadius="md"
              borderColor="gray.300"
              _focus={{ borderColor: "blue.500", boxShadow: "outline" }}
              color="gray.700"
              bg="white"
          />
          {suggestionText && query && suggestions.length > 0 && suggestions[0].label?.startsWith(query) && (
              <Text
                  position="absolute"
                  left="0"
                  top="0"
                  px="3"
                  py="2"
                  pointerEvents="none"
                  color="gray.400"
                  userSelect="none"
              >
                {currentInputText}<Text as="span" color="gray.400">{suggestionText}</Text>
              </Text>
          )}
        </Box>

        {suggestions.length > 0 && (
            <Box
                ref={listRef}
                position="absolute"
                width="100%"
                top="100%"
                left="0"
                zIndex="1"
                bg="white"
                borderRadius="md"
                boxShadow="md"
                border="1px"
                borderColor="gray.300"
            >
              {suggestions.map((item, index) => (
                  <Link
                      key={item.label}
                      display="block"
                      py="2"
                      px="3"
                      _hover={{ bg: "gray.100" }}
                      bg={activeIndex === index ? "gray.100" : "transparent"}
                      onClick={() => handleSuggestionClick(item)}
                  >
                    <Flex alignItems="center">
                      <Text fontSize="sm" color="gray.500">
                        {item.label}
                      </Text>
                      {item.post_count && (
                          <Text fontSize="xs" color="gray.400" ml="auto">
                            {item.post_count} post
                          </Text>
                      )}
                    </Flex>
                  </Link>
              ))}
            </Box>
        )}
      </Box>
  );
}