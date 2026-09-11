import { useEffect, useRef, useState } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight, FiList, FiX } from "react-icons/fi";

interface EpubViewerProps {
  src: ArrayBuffer;
  filename: string;
}

interface TocItem {
  href: string;
  label: string;
  subitems?: TocItem[];
}

interface DisplayedLocation {
  page: number;
  total: number;
}

interface RenditionLocation {
  start?: {
    href?: string;
    displayed?: DisplayedLocation;
  };
}

const EpubViewer = ({ src, filename }: EpubViewerProps) => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [currentChapter, setCurrentChapter] = useState("");
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(100);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!src || !viewer) {
      return;
    }

    // Give the DOM a tick to settle before epub.js measures the container.
    const init = window.setTimeout(() => {
      const book = ePub(src);

      bookRef.current = book;

      const rendition = book.renderTo(viewer, {
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
        a: {
          color: "#818CF8 !important",
        },
      });

      void rendition.display().then(() => {
        setLoading(false);

        // Force epub.js to recalculate layout after it becomes visible.
        window.setTimeout(() => {
          rendition.resize(viewer.clientWidth, viewer.clientHeight);
        }, 50);
      });

      void book.loaded.navigation.then((navigation) => {
        const navigationToc = navigation.toc as TocItem[];

        setToc(navigationToc);

        rendition.on("locationChanged", (location: RenditionLocation) => {
          if (!location?.start?.href) {
            return;
          }

          if (location.start.displayed) {
            setCurrentPage(location.start.displayed.page);

            setTotalPages(location.start.displayed.total);
          }

          const href = location.start.href.split("/").pop();

          if (!href) {
            return;
          }

          const chapter = navigationToc.find(
            (item) =>
              item.href?.split("/").pop() === href || item.href?.includes(href),
          );

          if (chapter) {
            setCurrentChapter(chapter.label);
          }
        });
      });

      rendition.on("keydown", (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") {
          void rendition.next();
        }

        if (event.key === "ArrowLeft") {
          void rendition.prev();
        }
      });
    }, 50);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      renditionRef.current?.resize(
        entry.contentRect.width,
        entry.contentRect.height,
      );
    });

    resizeObserver.observe(viewer);

    return () => {
      window.clearTimeout(init);
      resizeObserver.disconnect();

      bookRef.current?.destroy();

      bookRef.current = null;
      renditionRef.current = null;
    };
  }, [src]);

  const prev = (): void => {
    void renditionRef.current?.prev();
  };

  const next = (): void => {
    void renditionRef.current?.next();
  };

  const changeFontSize = (size: number): void => {
    setFontSize(size);

    renditionRef.current?.themes.fontSize(`${size}%`);
  };

  const goToChapter = (href: string): void => {
    void renditionRef.current?.display(href);
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
          onClick={() => setShowToc((previous) => !previous)}
        >
          <Icon as={FiList} boxSize="12px" />
          Contents
        </Flex>

        {/* Current chapter */}
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
            onChange={(event) => changeFontSize(Number(event.target.value))}
            style={{
              width: "72px",
              height: "3px",
              appearance: "none",
              background: `linear-gradient(to right, #6366F1 ${
                ((fontSize - 70) / 80) * 100
              }%, rgba(255,255,255,0.1) ${((fontSize - 70) / 80) * 100}%)`,
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
        {currentPage != null && totalPages != null && (
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
            css={{
              "&::-webkit-scrollbar": {
                width: "0px",
              },
            }}
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

            {toc.map((item, index) => (
              <Box
                key={`${item.href}-${index}`}
                px={4}
                py="8px"
                cursor="pointer"
                borderBottom="1px solid rgba(255,255,255,0.04)"
                transition="all 0.12s"
                _hover={{
                  bg: "rgba(255,255,255,0.04)",
                }}
                onClick={() => goToChapter(item.href)}
              >
                <Text
                  fontSize="13px"
                  color="rgba(255,255,255,0.6)"
                  noOfLines={1}
                >
                  {item.label}
                </Text>

                {item.subitems?.map((subitem, subIndex) => (
                  <Text
                    key={`${subitem.href}-${subIndex}`}
                    fontSize="12px"
                    color="rgba(255,255,255,0.35)"
                    pl={4}
                    py="4px"
                    cursor="pointer"
                    noOfLines={1}
                    _hover={{
                      color: "rgba(255,255,255,0.7)",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();

                      goToChapter(subitem.href);
                    }}
                  >
                    {subitem.label}
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
