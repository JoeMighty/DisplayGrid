import { useState, useEffect, useRef } from 'react';

export interface Slide {
  id: number;
  contentType: 'asset' | 'url' | 'html' | 'clock' | 'text' | 'stream';
  content: string | null;
  assetId: number | null;
  asset_filename: string | null;
  asset_mime_type: string | null;
  asset_type: string | null;
  durationSeconds: number;
  transition: string | null;
  enabled: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

function ClockSlide() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center justify-center w-full h-full bg-black">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 'min(20vw, 20vh)', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', fontFamily: 'system-ui, sans-serif' }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ fontSize: 'min(4vw, 4vh)', color: '#9ca3af', marginTop: '1rem', fontFamily: 'system-ui, sans-serif' }}>
          {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

function TextSlide({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#000', padding: '2rem' }}>
      <p style={{ fontSize: 'min(8vw, 8vh)', color: '#fff', textAlign: 'center', fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>{content}</p>
    </div>
  );
}

function StreamSlide({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    setError(null);
    let hls: import('hls.js').default | undefined;
    let pc: RTCPeerConnection | undefined;
    let cancelled = false;

    // Autoplay is unreliable for MSE/WebRTC-attached sources even when muted.
    // A watchdog keeps the stream playing: kicks off initial playback and
    // recovers from decoder stalls — this player runs unattended on kiosks.
    const kick = () => { video.play().catch(() => {}); };
    const watchdog = setInterval(() => {
      if (video.readyState >= 2 && video.paused) kick();
    }, 1500);

    async function start() {
      if (!video) return;
      if (/\.m3u8($|\?)/.test(url)) {
        // HLS — native on Safari, hls.js everywhere else
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
        } else {
          const { default: Hls } = await import('hls.js');
          if (cancelled) return;
          if (!Hls.isSupported()) throw new Error('HLS not supported on this device');
          hls = new Hls({ liveDurationInfinity: true });
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data?.fatal) setError('Stream unavailable');
          });
        }
      } else if (/\/whep(\/|$|\?)/.test(url)) {
        // WHEP (WebRTC-HTTP egress) — the endpoint go2rtc and MediaMTX expose
        pc = new RTCPeerConnection();
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.ontrack = (ev) => { video.srcObject = ev.streams[0]; kick(); };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        });
        if (!res.ok) throw new Error(`Stream unavailable (${res.status})`);
        await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
      } else {
        // Direct http(s) media URL
        video.src = url;
      }
    }
    start().catch(e => { if (!cancelled) setError(e?.message ?? 'Stream error'); });

    return () => {
      cancelled = true;
      clearInterval(watchdog);
      hls?.destroy();
      pc?.close();
      video.srcObject = null;
      video.removeAttribute('src');
    };
  }, [url]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        autoPlay muted playsInline
      />
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#4b5563', fontFamily: 'system-ui, sans-serif', fontSize: '1.25rem' }}>{error}</p>
        </div>
      )}
    </div>
  );
}

function SlideContent({ slide }: { slide: Slide }) {
  const src = `${API_BASE}/api/assets/${slide.assetId}/file`;

  if (slide.contentType === 'clock') return <ClockSlide />;

  if (slide.contentType === 'stream') return <StreamSlide url={slide.content ?? ''} />;

  if (slide.contentType === 'text') return <TextSlide content={slide.content ?? ''} />;

  if (slide.contentType === 'html') return (
    <iframe
      srcDoc={slide.content ?? ''}
      style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
      sandbox="allow-scripts allow-same-origin"
    />
  );

  if (slide.contentType === 'url') return (
    <iframe
      src={slide.content ?? ''}
      style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
      allow="autoplay"
    />
  );

  if (slide.contentType === 'asset') {
    if (slide.asset_type === 'video') return (
      <video
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        autoPlay muted loop playsInline
      />
    );
    if (slide.asset_type === 'image') return (
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
      />
    );
    if (slide.asset_type === 'pdf') return (
      <iframe
        src={src}
        style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
      />
    );
  }

  return <div style={{ background: '#111', width: '100%', height: '100%' }} />;
}

const TRANSITION_CSS: Record<string, string> = {
  'fade':        'opacity 0.6s ease',
  'slide-left':  'transform 0.5s ease, opacity 0.5s ease',
  'slide-right': 'transform 0.5s ease, opacity 0.5s ease',
  'slide-up':    'transform 0.5s ease, opacity 0.5s ease',
  'zoom':        'transform 0.6s ease, opacity 0.6s ease',
  'none':        'none',
};

function getEnterStyle(transition: string, entering: boolean): React.CSSProperties {
  if (!entering) return { opacity: 1, transform: 'none' };
  switch (transition) {
    case 'fade':        return { opacity: 0 };
    case 'slide-left':  return { opacity: 0, transform: 'translateX(100%)' };
    case 'slide-right': return { opacity: 0, transform: 'translateX(-100%)' };
    case 'slide-up':    return { opacity: 0, transform: 'translateY(100%)' };
    case 'zoom':        return { opacity: 0, transform: 'scale(0.85)' };
    default:            return { opacity: 1 };
  }
}

interface SlidePlayerProps {
  slides: Slide[];
  onSlideChange?: (slideId: number) => void;
}

export default function SlidePlayer({ slides, onSlideChange }: SlidePlayerProps) {
  const [index, setIndex]       = useState(0);
  const [entering, setEntering] = useState(false);
  const timerRef                = useRef<ReturnType<typeof setTimeout>>();

  const enabled = slides.filter(s => s.enabled);

  useEffect(() => {
    if (!enabled.length) return;
    setEntering(true);
    const enter = setTimeout(() => setEntering(false), 50);

    const slide = enabled[index % enabled.length];
    onSlideChange?.(slide.id);

    timerRef.current = setTimeout(() => {
      setIndex(i => (i + 1) % enabled.length);
    }, slide.durationSeconds * 1000);

    return () => { clearTimeout(enter); clearTimeout(timerRef.current); };
  }, [index, enabled.length]); // eslint-disable-line

  if (!enabled.length) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <p style={{ color: '#374151', fontFamily: 'system-ui', fontSize: '1.5rem' }}>No slides in playlist</p>
      </div>
    );
  }

  const slide      = enabled[index % enabled.length];
  const transition = slide.transition ?? 'fade';
  const style: React.CSSProperties = {
    width: '100%', height: '100%',
    transition: TRANSITION_CSS[transition] ?? TRANSITION_CSS.fade,
    ...getEnterStyle(transition, entering),
  };

  return (
    <div style={style}>
      <SlideContent slide={slide} />
    </div>
  );
}
