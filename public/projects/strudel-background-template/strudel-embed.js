const STRUDEL_PATCH = `$: s("[bd <hh oh>]*2").bank("tr909").dec(.4)
.hush()

$: s("[~ sd ~ sd ]*8").bank("tr909").dec(.4)
//.hush()


await initHydra()
// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// by Zach Krall
// http://zachkrall.online/
// A basic Hydra oscillator that creates colorful waves
osc(4, 0.1, 1.2)
  .color(0.5, 0.8, 1)
  .layer(
    noise(3)
      .color(1, 0.5, 0.5)
      .mask(shape(4, 0.5, 0.01))
  )
  .out()`;

function encodeUtf8Base64(source) {
  const bytes = new TextEncoder().encode(source);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function getStrudelEmbedUrl() {
  const encodedPatch = encodeURIComponent(encodeUtf8Base64(STRUDEL_PATCH));
  return `https://strudel.cc/embed/#${encodedPatch}`;
}

export function mountStrudelFrame(iframe, link) {
  const embedUrl = getStrudelEmbedUrl();

  iframe.src = embedUrl;

  if (link) {
    link.href = embedUrl;
  }

  return embedUrl;
}
