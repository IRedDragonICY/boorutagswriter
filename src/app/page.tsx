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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseHTMLSuggestions = useCallback((html: string): Suggestion[] => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = doc.querySelectorAll("li.ui-menu-item");
    const results: Suggestion[] = [];
    items.forEach((item) => {
      const type = item.getAttribute("data-autocomplete-type") || undefined;
      const value = item.getAttribute("data-autocomplete-value") || undefined;
      const postCount = item.querySelector(".post-count");
      const tagClass = item.querySelector("a")?.classList.item(0);
      const antecedent = item.querySelector(".autocomplete-antecedent span:nth-child(2)");
      results.push({
        label: value,
        searchName: value,
        type,
        post_count: postCount?.textContent?.trim(),
        category: tagClass ? parseInt(tagClass.split("-").pop() || "0", 10) : 0,
        antecedent: antecedent?.textContent?.trim(),
      });
    });
    return results;
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    fetch(
        `https://danbooru.donmai.us/autocomplete?search%5Bquery%5D=${encodeURIComponent(query)}&search%5Btype%5D=tag_query&version=1&limit=20`,
        { signal: controller.signal }
    )
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.text();
        })
        .then((html) => setSuggestions(parseHTMLSuggestions(html)))
        .catch((err) => {
          if (err.name === "AbortError") return;
          console.error(err);
        });
    return () => controller.abort();
  }, [query, parseHTMLSuggestions]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current?.children[activeIndex]) {
      (listRef.current.children[activeIndex] as HTMLLIElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        setQuery(suggestions[activeIndex].searchName || suggestions[activeIndex].label || "");
        setSuggestions([]);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = useCallback((item: Suggestion) => {
    setQuery(item.searchName || item.label || "");
    setSuggestions([]);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }, []);

  return (
      <Box width="400px" mx="auto" mt="50px" position="relative">
        <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari tag..."
            size="md"
            borderRadius="md"
            borderColor="gray.300"
            _focus={{ borderColor: "blue.500", boxShadow: "outline" }}
            color="gray.700"
            bg="white"
        />
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
