import ePub from "epubjs";
import { FiChevronLeft, FiChevronRight, FiList, FiX } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text, Icon } from "@chakra-ui/react";
const EpubViewer = ({ src, filename }) => {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [toc, setToc] = useState([]);
  const [showToc, setShowToc] = useState(false);
  const [currentChapter, setCurrentChapter] = useState("");
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(null);
  const [totalPages, setTotalPages] = useState(null);

  useEffect(() => {
    if (!src || !viewerRef.current) return;

    // Give the DOM a tick to settle before epub.js measures the container
    const init = setTimeout(() => {
      const book = ePub(src);
      bookRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "none",
        allowScriptedContent: true,
      });

      renditionRef.current = rendition;

      rendition.themes.default({
        body: {
          background: "#1A202C !important",
          color: "rgba(255,255,255,0.85) !important",
          fontFamily: "Georgia, serif !important",
          lineHeight: "1.8 !important",
        },
        a: { color: "#818CF8 !important" },
      });

      rendition.display().then(() => {
        setLoading(false);
        // Force epub.js to recalculate layout after it becomes visible
        setTimeout(() => {
          rendition.resize("100%", "100%");
        }, 50);
      });

      book.loaded.navigation.then((nav) => {
        setToc(nav.toc);

        rendition.on("locationChanged", (loc) => {
          if (!loc?.start?.href) return;

          if (loc.start?.displayed) {
            setCurrentPage(loc.start.displayed.page);
            setTotalPages(loc.start.displayed.total);
          }

          const href = loc.start.href.split("/").pop();
          const chapter = nav.toc?.find(
            (item) =>
              item.href?.split("/").pop() === href || item.href?.includes(href),
          );
          if (chapter) setCurrentChapter(chapter.label);
        });
      });

      rendition.on("keydown", (e) => {
        if (e.key === "ArrowRight") rendition.next();
        if (e.key === "ArrowLeft") rendition.prev();
      });
    }, 50);

    const resizeObserver = new ResizeObserver(() => {
      renditionRef.current?.resize("100%", "100%");
    });

    resizeObserver.observe(viewerRef.current);

    return () => {
      clearTimeout(init);
      resizeObserver.disconnect();
      bookRef.current?.destroy();
    };
  }, [src]);

  const prev = () => renditionRef.current?.prev();
  const next = () => renditionRef.current?.next();

  const changeFontSize = (size) => {
    setFontSize(size);
    renditionRef.current?.themes.fontSize(`${size}%`);
  };
  const goToChapter = (href) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  };

  return (
    <Box h="100%" display="flex" flexDirection="column" position="relative">
      {/* Reader toolbar */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        h="44px"
        flexShrink={0}
        borderBottom="1px solid rgba(255,255,255,0.06)"
        bg="gray.900"
        gap={3}
      >
        {/* TOC toggle */}
        <Flex
          align="center"
          gap={2}
          px={3}
          h="28px"
          borderRadius="6px"
          border="1px solid rgba(255,255,255,0.08)"
          cursor="pointer"
          color="rgba(255,255,255,0.4)"
          fontSize="12px"
          flexShrink={0}
          transition="all 0.12s"
          _hover={{
            borderColor: "rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.8)",
          }}
          onClick={() => setShowToc(!showToc)}
        >
          <Icon as={FiList} boxSize="12px" />
          Contents
        </Flex>

        {/* Current chapter — takes remaining space */}
        <Text
          fontSize="12px"
          color="rgba(255,255,255,0.3)"
          fontFamily="'JetBrains Mono', monospace"
          noOfLines={1}
          flex={1}
          minW={0}
        >
          {currentChapter || filename}
        </Text>

        {/* Font size slider */}
        <Flex align="center" gap={2} flexShrink={0}>
          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            A
          </Text>
          <input
            type="range"
            min={70}
            max={150}
            step={5}
            value={fontSize}
            onChange={(e) => changeFontSize(Number(e.target.value))}
            style={{
              width: "72px",
              height: "3px",
              appearance: "none",
              background: `linear-gradient(to right, #6366F1 ${((fontSize - 70) / 80) * 100}%, rgba(255,255,255,0.1) ${((fontSize - 70) / 80) * 100}%)`,
              borderRadius: "2px",
              outline: "none",
              cursor: "pointer",
            }}
          />
          <Text
            fontSize="13px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            A
          </Text>
        </Flex>

        {/* Page counter */}
        {currentPage && totalPages && (
          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
            flexShrink={0}
            minW="60px"
            textAlign="center"
          >
            {currentPage} / {totalPages}
          </Text>
        )}

        {/* Prev / Next */}
        <Flex align="center" gap={2} flexShrink={0}>
          <Flex
            w="28px"
            h="28px"
            align="center"
            justify="center"
            borderRadius="6px"
            border="1px solid rgba(255,255,255,0.08)"
            cursor="pointer"
            color="rgba(255,255,255,0.4)"
            transition="all 0.12s"
            _hover={{
              borderColor: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.8)",
            }}
            onClick={prev}
          >
            <Icon as={FiChevronLeft} boxSize="14px" />
          </Flex>
          <Flex
            w="28px"
            h="28px"
            align="center"
            justify="center"
            borderRadius="6px"
            border="1px solid rgba(255,255,255,0.08)"
            cursor="pointer"
            color="rgba(255,255,255,0.4)"
            transition="all 0.12s"
            _hover={{
              borderColor: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.8)",
            }}
            onClick={next}
          >
            <Icon as={FiChevronRight} boxSize="14px" />
          </Flex>
        </Flex>
      </Flex>

      {/* Reader area */}
      <Box flex={1} position="relative" overflow="hidden">
        {/* TOC drawer */}
        {showToc && (
          <Box
            position="absolute"
            top={0}
            left={0}
            w="280px"
            h="100%"
            bg="gray.900"
            borderRight="1px solid rgba(255,255,255,0.06)"
            zIndex={10}
            overflowY="auto"
            css={{ "&::-webkit-scrollbar": { width: "0px" } }}
          >
            <Flex
              align="center"
              justify="space-between"
              px={4}
              py={3}
              borderBottom="1px solid rgba(255,255,255,0.06)"
            >
              <Text
                fontSize="10px"
                fontWeight={700}
                letterSpacing="0.1em"
                textTransform="uppercase"
                color="rgba(255,255,255,0.3)"
              >
                Contents
              </Text>
              <Flex
                w="20px"
                h="20px"
                align="center"
                justify="center"
                borderRadius="4px"
                cursor="pointer"
                color="rgba(255,255,255,0.3)"
                _hover={{
                  color: "rgba(255,255,255,0.7)",
                  bg: "rgba(255,255,255,0.06)",
                }}
                onClick={() => setShowToc(false)}
              >
                <Icon as={FiX} boxSize="12px" />
              </Flex>
            </Flex>
            {toc.map((item, i) => (
              <Box
                key={i}
                px={4}
                py="8px"
                cursor="pointer"
                borderBottom="1px solid rgba(255,255,255,0.04)"
                transition="all 0.12s"
                _hover={{ bg: "rgba(255,255,255,0.04)" }}
                onClick={() => goToChapter(item.href)}
              >
                <Text
                  fontSize="13px"
                  color="rgba(255,255,255,0.6)"
                  noOfLines={1}
                >
                  {item.label}
                </Text>
                {item.subitems?.length > 0 &&
                  item.subitems.map((sub, j) => (
                    <Text
                      key={j}
                      fontSize="12px"
                      color="rgba(255,255,255,0.35)"
                      pl={4}
                      py="4px"
                      cursor="pointer"
                      noOfLines={1}
                      _hover={{ color: "rgba(255,255,255,0.7)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToChapter(sub.href);
                      }}
                    >
                      {sub.label}
                    </Text>
                  ))}
              </Box>
            ))}
          </Box>
        )}

        {/* Loading state */}
        {loading && (
          <Flex
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            align="center"
            justify="center"
            gap={3}
            bg="gray.800"
            zIndex={20}
          >
            <Box
              w="14px"
              h="14px"
              borderRadius="full"
              border="2px solid rgba(99,102,241,0.3)"
              borderTopColor="#818CF8"
              animation="spin 0.7s linear infinite"
            />
            <Text fontSize="12px" color="rgba(255,255,255,0.3)">
              Loading book…
            </Text>
          </Flex>
        )}

        {/* epub.js renders here — always visible, never display:none */}
        <Box ref={viewerRef} h="100%" w="100%" />
      </Box>

      {/* Click zones for navigation */}
      <Box
        position="absolute"
        left={showToc ? "280px" : 0}
        top="44px"
        w="80px"
        bottom={0}
        cursor="pointer"
        onClick={prev}
        zIndex={5}
      />
      <Box
        position="absolute"
        right={0}
        top="44px"
        w="80px"
        bottom={0}
        cursor="pointer"
        onClick={next}
        zIndex={5}
      />
    </Box>
  );
};

export default EpubViewer;
