import { useRef, useEffect, useState, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { usePlayerStore } from "../../../store/playerStore";
import styles from "./style.module.css";
import "swiper/css";

export function SongsArea() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const shuffleQueue = usePlayerStore((s) => s.shuffleQueue);
  const shufflePos = usePlayerStore((s) => s.shufflePos);
  const repeat = usePlayerStore((s) => s.repeat);
  const playSong = usePlayerStore((s) => s.playSong);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const stop = usePlayerStore((s) => s.stop);

  const orderedQueue =
    shuffle && shuffleQueue.length > 0
      ? shuffleQueue.map((idx) => queue[idx]).filter(Boolean)
      : queue;

  const currentPos =
    shuffle && shuffleQueue.length > 0 ? shufflePos : queueIndex;

  const queueKey = orderedQueue.map((s) => s.id).join(",");
  const swiperRef = useRef(null);
  const userSwiped = useRef(false);
  const scrollAcc = useRef(0);
  const scrollTimer = useRef(null);
  const initialSlide = repeat ? orderedQueue.length + currentPos : currentPos;

  const [activeSlide, setActiveSlide] = useState(initialSlide);
  const slides = repeat
    ? [...orderedQueue, ...orderedQueue, ...orderedQueue]
    : orderedQueue;
  const dragStart = useRef(null);
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const [slideHeight, setSlideHeight] = useState(52);
  const [dragging, setDragging] = useState(false);

  const goTo = useCallback(
    (index) => {
      const swiper = swiperRef.current;
      if (!swiper) return;
      const n = orderedQueue.length;
      let target = index;

      if (repeat) {
        if (target < 0) target = 0;
        if (target >= slides.length) target = slides.length - 1;
        const realIndex = target % n;
        const song = orderedQueue[realIndex];
        if (song && song.id !== currentSong?.id) {
          userSwiped.current = true;
          playSong(song, orderedQueue);
        }
      } else {
        if (target < 0) target = 0;
        if (target >= n) target = n - 1;
        const song = orderedQueue[target];
        if (song && song.id !== currentSong?.id) {
          userSwiped.current = true;
          playSong(song, orderedQueue);
        }
      }

      swiper.slideTo(target, 200);
      setActiveSlide(target);
    },
    [orderedQueue, currentSong, repeat, slides.length, playSong],
  );

  const handleMouseDown = useCallback((e) => {
    e.preventDefault(); // bloqueia seleção de texto
    dragStart.current = e.clientY;
    isDragging.current = false;
    setDragging(true);
  }, []);

  const handleMouseUp = useCallback(
    (e) => {
      if (dragStart.current === null) return;
      const diff = e.clientY - dragStart.current;
      dragStart.current = null;
      setDragging(false);

      if (!isDragging.current) return;
      isDragging.current = false;

      const steps = Math.round(-diff / slideHeight);
      if (steps === 0) return;
      goTo(activeSlide + steps);
    },
    [activeSlide, goTo, slideHeight],
  );

  const handleMouseMove = useCallback((e) => {
    if (dragStart.current === null) return;
    const diff = Math.abs(e.clientY - dragStart.current);
    if (diff > 5) isDragging.current = true;
  }, []);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    if (userSwiped.current) {
      userSwiped.current = false;
      return;
    }
    const target = repeat ? orderedQueue.length + currentPos : currentPos;
    swiper.slideTo(target, 200);
    setActiveSlide(target);
  }, [currentPos]);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      scrollAcc.current += e.deltaY;

      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        const steps = Math.round(scrollAcc.current / 60);
        scrollAcc.current = 0;
        if (steps === 0) return;
        const clamped = Math.sign(steps); // scroll: sempre 1 passo
        goTo(activeSlide + clamped);
      }, 50);
    },
    [activeSlide, goTo],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      const calculated = Math.min(80, Math.max(52, Math.floor(h / 10)));
      setSlideHeight(calculated);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleSlideChange = (swiper) => {
    setActiveSlide(swiper.activeIndex);
  };

  if (orderedQueue.length === 0) {
    return (
      <div className={styles.songsArea}>
        <p className={styles.empty}>Fila vazia</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.songsArea} ${dragging ? styles.dragging : ""}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        dragStart.current = null;
        isDragging.current = false;
        setDragging(false);
      }}
    >
      <Swiper
        key={`${repeat ? "loop" : "linear"}-${queueKey}`}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          setActiveSlide(initialSlide);
        }}
        direction="vertical"
        centeredSlides
        slidesPerView="auto"
        initialSlide={initialSlide}
        simulateTouch={false}
        allowTouchMove={false}
        modules={[]}
        className={styles.swiper}
        onSlideChange={handleSlideChange}
      >
        {slides.map((song, i) => {
          const isCurrent = i === activeSlide;
          const isNext = i === activeSlide + 1;
          const distance = Math.abs(i - activeSlide);

          return (
            <SwiperSlide
              key={`${song.id}-${i}`}
              className={styles.slide}
              style={{ height: `${slideHeight}px` }}
            >
              <div
                className={`${styles.card} ${isCurrent ? styles.current : ""}`}
                style={getDepthStyle(distance)}
              >
                <div className={styles.cardInner}>
                  <span className={styles.title}>{song.title}</span>
                  {song.artist && (
                    <span className={styles.artist}>{song.artist}</span>
                  )}
                </div>
                {isCurrent && (
                  <span className={styles.badgeCurrent}>Agora</span>
                )}
                {isNext && <span className={styles.badgeNext}>A seguir</span>}
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <button
        className={styles.clearBtn}
        onClick={() => {
          clearQueue();
          stop();
        }}
      >
        Limpar fila
      </button>
    </div>
  );
}

const getDepthStyle = (distance) => {
  const clamped = Math.min(distance, 3);
  const opacity = [1, 0.55, 0.3, 0.12][clamped];
  const scale = [1, 0.93, 0.86, 0.79][clamped];
  return {
    opacity,
    transform: `scale(${scale})`,
    willChange: distance <= 3 ? "transform, opacity" : "auto",
  };
};
