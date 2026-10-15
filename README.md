# VihangNet — Sound Made Visible

Audio-reactive three-field particle network visualizer built with **PHP 8.1+, native WebGL2, Web Audio and JavaScript**, with an offline Python helper for FFmpeg MP4 conversion.

## Features

- Three independent GPU-accelerated 3D particle constellations, rendered from the same live audio analyzer.
- Bass, midrange and high-frequency reactivity; RMS, spectral flux, centroid and an approximate tonality index.
- **Three cinematic camera profiles:** orbit, flythrough/dolly, and beat-driven pulse.
- Constellation, orbital and wave topologies, real-time intensity and density controls.
- MP3, WAV, M4A and OGG playback entirely in the browser. Demo WAV generated in memory.
- Local **video recording with audio**: 1280 × 720 and 1920 × 1080 options; MP4 when supported by `MediaRecorder`, otherwise WebM. Records up to three minutes per take.
- PNG snapshots, fullscreen visualization, desktop/mobile responsive UI.
- Browser Canvas2D fallback when WebGL2 is unavailable. No third-party JavaScript dependencies.

## Run locally

```bash
php -S 127.0.0.1:8080 -t public
```

Open http://127.0.0.1:8080, click **Try Demo Sound** or select your own MP3, choose camera mode and press **Start Recording**. Music is processed in the browser; it is not uploaded to the server.

## Video files and MP4

**Recording formats depend on the browser.** The recorder checks `MediaRecorder.isTypeSupported()`, requests MP4/H.264 when possible, and falls back to WebM/VP9 or VP8. It names the download according to the actual recorded container; a WebM file is never renamed `.mp4`. Safari and some Chrome versions may support native MP4, while other browsers cannot. For those browsers, the optional Python converter creates a standard H.264/AAC MP4 **offline**, with FFmpeg installed:

```bash
python3 private/python/convert.py input-recording.webm output.mp4
```

The conversion helper **is not a public upload API**; it intentionally does not accept untrusted anonymous video uploads. Cloudways playback and visual recording do not require Python or FFmpeg. To obtain MP4 on a browser without native MP4 capture, convert the downloaded WebM with the command above.

If the recording begins while the track is paused, playback is resumed. Stop recording to download the movie; recording also stops at track end or after three minutes. Audio capture is wired from the Web Audio `MediaElementSource` into a separate `MediaStreamDestination` (not from the microphone).

## DigiOps deployment

Repository: `indigiti/VihangNet`
Branch: `main`
Artifact: `digiops-release`
Public URL: `/vihangnet/`
Public folder: `public_html/vihangnet/`
Private folder: `private_html/vihangnet/`

The GitHub Actions workflow runs PHP/JS/Python syntax checks, HTTP smoke checks, and a Chromium desktop/mobile E2E test (including MP3 playback, visual rendering and video download). It publishes the DigiOps artifact **only after tests pass**. The release artifact contains `public/` and `private/` roots, `RELEASE.json` and no runtime secrets. The private conversion tool remains outside the web root.

## Limits and requirements

- WebGL2 needs a browser with working GPU/WebGL drivers; 2D fallback requires Canvas2D.
- Performance depends on the user's device and viewport. On low-end devices, lower particle density and use HD capture.
- Browser video capture requires `HTMLCanvasElement.captureStream()` and `MediaRecorder`; unsupported browsers disable recording.
- Recording is limited to three minutes to reduce memory spikes from browser-native in-memory blobs.
- MP4 cross-browser export requires external transcoding if the current browser does not support an MP4 encoder.
- This is an audio-reactive generative visualization, not a promise of reproducing the exact reel graphics.
