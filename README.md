# ata23kan.github.io

Personal academic website: plain HTML, CSS and JavaScript, served by GitHub Pages.
There is no build step: edit the `.html` files and push. To preview, open
`index.html` in a browser.

## Where things are

| To change…                         | Edit                                   |
|------------------------------------|----------------------------------------|
| Bio, news, selected papers, education | `index.html`                        |
| Research statement and projects    | `research.html`                        |
| Full publication list              | `publications.html`                    |
| Colors, fonts, layout              | `assets/css/main.css` (colors are at the top) |
| CV                                 | replace `assets/Atakan_Aygun_CV.pdf`   |

The header and footer are repeated in each page; if you change a link there,
change it in all three files.

## Adding a research project

1. Export the animation (a GIF from ParaView is fine) and convert it to MP4. Crop to
   the domain so the grey ParaView background, axes and colorbar are removed
   (`crop=width:height:x:y`, in pixels):

   ```sh
   ffmpeg -i in.gif -vf "crop=924:680:160:52,format=yuv420p" \
     -c:v libx264 -crf 26 -preset slow -tune animation -movflags +faststart -an assets/media/name.mp4
   ffmpeg -i assets/media/name.mp4 -frames:v 1 -q:v 3 assets/media/name.jpg   # poster frame
   ```

   Raise `-crf` (e.g. 28) for smaller files; lower it (e.g. 22) if thin mesh lines blur.
2. In `research.html`, copy an `<article class="project">` block (newest first) and
   change the video path, `width`/`height` (the video's pixel size), text and link.
   Rows alternate sides automatically.

Keep each file under ~5 MB; host longer movies on YouTube or Vimeo. Do not use Git
LFS (GitHub Pages does not serve LFS files).
