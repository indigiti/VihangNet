# VihangNet — Audio Reactive Studio

PHP 8.1+ frontend serving a browser-based Web Audio / Canvas particle-network visualizer. Optional private Python analysis runs only when explicitly enabled and requested; no database is needed.

## Development

`php -S 127.0.0.1:8080 -t public`

Then visit `http://127.0.0.1:8080/` and select an audio file. Playback is browser-local. Cloudways/DigiOps production builds publish the `digiops-release` artifact with `public/` and `private/` roots.

## DigiOps

Deploy branch `main`, artifact `digiops-release`, URL `/vihangnet/`, public path `public_html/vihangnet/`, private path `private_html/vihangnet/`. Never expose the private folder as a website root. The optional Python endpoint is disabled unless `ENABLE_PYTHON_ANALYSIS=1` is configured, the Python dependencies are installed, and upload throttling is in place.
