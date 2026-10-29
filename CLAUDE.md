# Habitat Visualiser

Next.js app in `habitat-app/` (MongoDB, NextAuth, Cloudinary for images). Deployment: `habitat-app/DEPLOYMENT.md`.

## Notes for agents

Open issues, decisions and history are written down in `habitat-app/docs/notes/`. Read the relevant note before working on a related area, and add or update a note when you leave something unfinished.

- `habitat-app/docs/notes/image-upload-size.md` — image upload fails on large photos (proxy body limit); open: choose and enforce a size limit. Do not add image compression: original-quality images are required.
